import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval, Subscription } from 'rxjs';

import { ProcessPanelComponent } from '../process-panel/process-panel.component';
import { AlgorithmSelectorComponent } from '../algorithm-selector/algorithm-selector.component';
import { GanttChartComponent } from '../gantt-chart/gantt-chart.component';
import { ReadyQueueComponent } from '../ready-queue/ready-queue.component';
import { PlaybackControlComponent, PlayMode } from '../playback-control/playback-control.component';
import { StatsPanelComponent } from '../stats-panel/stats-panel.component';
import { VruntimeChartComponent } from '../vruntime-chart/vruntime-chart.component';

import { Process, AlgorithmConfig, SchedulerResult, QueueSnapshot } from '../../models/process.model';
import { SchedulerService } from '../../services/scheduler.service';
import { ProcessService } from '../../services/process.service';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProcessPanelComponent,
    AlgorithmSelectorComponent,
    GanttChartComponent,
    ReadyQueueComponent,
    PlaybackControlComponent,
    StatsPanelComponent,
    VruntimeChartComponent
  ],
  template: `
    <div class="simulator-container">
      <div class="left-panel">
        <app-process-panel 
          (processesChange)="onProcessesChange($event)"
          [readOnly]="mode !== 'idle'"
        ></app-process-panel>
        
        <app-algorithm-selector
          [availableAlgorithms]="availableAlgorithms"
          [initialConfig]="algorithmConfig"
          (configChange)="onAlgorithmConfigChange($event)"
        ></app-algorithm-selector>
        
        <div class="card compare-section" *ngIf="compareMode">
          <div class="card-title">
            <span>🔀 多算法对比</span>
          </div>
          <p class="hint">选择 2-4 种算法进行对比模拟</p>
          <p class="mode-hint" [class.locked]="mode !== 'idle'">
            <span *ngIf="mode === 'idle'">✓ 可自由选择算法</span>
            <span *ngIf="mode !== 'idle'">🔒 模拟运行中，请先重置再切换算法</span>
          </p>
          <div class="compare-algorithms">
            <label *ngFor="let algo of allAlgorithms" class="algo-checkbox-label">
              <input 
                type="checkbox" 
                [checked]="compareAlgorithms.includes(algo.type)"
                (change)="toggleCompareAlgo(algo.type)"
                [disabled]="mode !== 'idle'"
              />
              <span class="checkbox-custom"></span>
              <span class="algo-name">{{ algo.name }}</span>
              <span class="algo-selected" *ngIf="compareAlgorithms.includes(algo.type)">✓</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="right-panel">
        <div class="top-bar">
          <app-playback-control
            [currentTime]="currentTime"
            [totalTime]="totalTime"
            [mode]="mode"
            [canPlay]="canStartSimulation"
            (play)="onPlay()"
            (pause)="onPause()"
            (stepForward)="onStepForward()"
            (stepBack)="onStepBack()"
            (jumpToEnd)="onJumpToEnd()"
            (reset)="onReset()"
            (seek)="onSeek($event)"
            (speedChange)="onSpeedChange($event)"
          ></app-playback-control>
        </div>
        
        <div class="main-content" [class.compare-mode]="compareMode && compareResults.length > 1">
          <ng-container *ngIf="!compareMode || compareResults.length <= 1">
            <app-gantt-chart
              [result]="simulationResult"
              [currentTime]="currentTime"
              [showMarker]="mode !== 'idle'"
              [timeUnitWidth]="timeUnitWidth"
              (seekTime)="onSeek($event)"
            ></app-gantt-chart>
            
            <div class="bottom-row">
              <div class="queue-panel">
                <app-ready-queue
                  [snapshot]="currentSnapshot"
                  [processes]="simulationResult?.processes || null"
                  [algorithmType]="algorithmConfig.type"
                  [currentTime]="currentTime"
                  [mlfqTimeSlices]="algorithmConfig.mlfqTimeSlices || [8, 16, 32]"
                ></app-ready-queue>
              </div>
              
              <div class="stats-panel">
                <app-stats-panel
                  *ngIf="simulationResult"
                  [processes]="processList"
                  [stats]="simulationResult.stats"
                ></app-stats-panel>
              </div>
            </div>
            
            <app-vruntime-chart
              *ngIf="simulationResult && algorithmConfig.type === 'cfs'"
              [vruntimeHistory]="simulationResult.vruntimeHistory"
              [processes]="processList"
              [currentTime]="currentTime"
              class="vruntime-section"
            ></app-vruntime-chart>
          </ng-container>
          
          <div class="compare-grid" *ngIf="compareMode && compareResults.length > 1">
            <div 
              *ngFor="let result of compareResults; let i = index"
              class="compare-item"
            >
              <div class="compare-header">
                <h3>{{ result.algorithmName }}</h3>
              </div>
              <app-gantt-chart
                [result]="result.result"
                [currentTime]="currentTime"
                [showMarker]="mode !== 'idle'"
                [timeUnitWidth]="timeUnitWidth"
                (seekTime)="onSeek($event)"
              ></app-gantt-chart>
            </div>
          </div>
          
          <div class="compare-stats" *ngIf="compareMode && compareResults.length > 1">
            <div class="card">
              <div class="card-title">📊 指标对比汇总</div>
              <table>
                <thead>
                  <tr>
                    <th>指标</th>
                    <th *ngFor="let r of compareResults">{{ r.algorithmName }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>平均等待时间</td>
                    <td *ngFor="let r of compareResults" 
                        [class.best]="isBestValue('avgWaitingTime', r.result.stats.avgWaitingTime)"
                        [class.worst]="isWorstValue('avgWaitingTime', r.result.stats.avgWaitingTime)">
                      {{ r.result.stats.avgWaitingTime.toFixed(2) }}
                    </td>
                  </tr>
                  <tr>
                    <td>平均周转时间</td>
                    <td *ngFor="let r of compareResults"
                        [class.best]="isBestValue('avgTurnaroundTime', r.result.stats.avgTurnaroundTime)"
                        [class.worst]="isWorstValue('avgTurnaroundTime', r.result.stats.avgTurnaroundTime)">
                      {{ r.result.stats.avgTurnaroundTime.toFixed(2) }}
                    </td>
                  </tr>
                  <tr>
                    <td>平均响应时间</td>
                    <td *ngFor="let r of compareResults"
                        [class.best]="isBestValue('avgResponseTime', r.result.stats.avgResponseTime)"
                        [class.worst]="isWorstValue('avgResponseTime', r.result.stats.avgResponseTime)">
                      {{ r.result.stats.avgResponseTime.toFixed(2) }}
                    </td>
                  </tr>
                  <tr>
                    <td>CPU 利用率</td>
                    <td *ngFor="let r of compareResults"
                        [class.best]="isBestValue('cpuUtilization', r.result.stats.cpuUtilization, true)"
                        [class.worst]="isWorstValue('cpuUtilization', r.result.stats.cpuUtilization, true)">
                      {{ r.result.stats.cpuUtilization.toFixed(1) }}%
                    </td>
                  </tr>
                  <tr>
                    <td>吞吐量</td>
                    <td *ngFor="let r of compareResults"
                        [class.best]="isBestValue('throughput', r.result.stats.throughput, true)"
                        [class.worst]="isWorstValue('throughput', r.result.stats.throughput, true)">
                      {{ r.result.stats.throughput.toFixed(3) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <button class="toggle-compare-btn" (click)="compareMode = !compareMode">
      {{ compareMode ? '退出对比' : '多算法对比' }}
    </button>
  `,
  styles: [`
    .simulator-container {
      display: flex;
      flex-direction: row;
      gap: 16px;
      width: 100%;
      min-width: 0;
    }
    
    @media (max-width: 960px) {
      .simulator-container {
        flex-direction: column;
      }
      
      .left-panel {
        width: 100% !important;
        min-width: 0 !important;
        max-height: none !important;
      }
    }
    
    .left-panel {
      width: 380px;
      min-width: 380px;
      overflow-y: auto;
      padding-right: 4px;
      flex-shrink: 0;
      max-height: calc(100vh - 180px);
    }
    
    .right-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 12px;
    }
    
    .top-bar {
      flex-shrink: 0;
    }
    
    .main-content {
      flex: 1;
      overflow-y: auto;
      padding-right: 4px;
      min-height: 400px;
    }
    
    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 16px;
    }
    
    @media (max-width: 1200px) {
      .bottom-row {
        grid-template-columns: 1fr;
      }
    }
    
    .vruntime-section {
      width: 100%;
    }
    
    .queue-panel, .stats-panel {
      min-width: 0;
    }
    
    .compare-section .hint {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
    }
    
    .mode-hint {
      font-size: 11px;
      padding: 6px 10px;
      background: #d1fae5;
      color: #065f46;
      border-radius: 6px;
      margin-bottom: 12px;
      font-weight: 500;
    }
    
    .mode-hint.locked {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .compare-algorithms {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .algo-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      cursor: pointer;
      padding: 8px 10px;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      transition: all 0.15s ease;
      position: relative;
      user-select: none;
    }
    
    .algo-checkbox-label:hover:not(:has(input:disabled)) {
      border-color: #a5b4fc;
      background: #eef2ff;
    }
    
    .algo-checkbox-label:has(input:checked) {
      border-color: #667eea;
      background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
    }
    
    .algo-checkbox-label:has(input:disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .algo-checkbox-label input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .checkbox-custom {
      width: 18px;
      height: 18px;
      border: 2px solid #cbd5e0;
      border-radius: 4px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    
    .algo-checkbox-label:has(input:checked) .checkbox-custom {
      background: #667eea;
      border-color: #667eea;
    }
    
    .algo-checkbox-label:has(input:checked) .checkbox-custom::after {
      content: '✓';
      color: white;
      font-size: 12px;
      font-weight: 700;
    }
    
    .algo-name {
      color: #334155;
      font-weight: 500;
      flex: 1;
    }
    
    .algo-checkbox-label:has(input:checked) .algo-name {
      color: #4338ca;
    }
    
    .algo-selected {
      color: #667eea;
      font-weight: 700;
      font-size: 14px;
    }
    
    .main-content.compare-mode .bottom-row {
      display: none;
    }
    
    .compare-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .compare-item {
      min-width: 0;
    }
    
    .compare-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 14px;
      border-radius: 8px 8px 0 0;
      margin-bottom: -1px;
    }
    
    .compare-header h3 {
      margin: 0;
      font-size: 14px;
    }
    
    .compare-stats {
      margin-top: 12px;
    }
    
    .compare-stats table {
      width: 100%;
    }
    
    .compare-stats td {
      text-align: center;
    }
    
    .compare-stats td.best {
      background: #d1fae5;
      color: #065f46;
      font-weight: 600;
    }
    
    .compare-stats td.worst {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .toggle-compare-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 24px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      z-index: 100;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .toggle-compare-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }
  `]
})
export class SimulatorComponent implements OnInit, OnDestroy {
  processes: Process[] = [];
  algorithmConfig: AlgorithmConfig = {
    type: 'fcfs',
    name: '先来先服务',
    timeQuantum: 4,
    preemptive: false,
    mlfqLevels: 3,
    mlfqTimeSlices: [8, 16, 32],
    mlfqBoostInterval: 30,
    mlfqBottomPolicy: 'fcfs',
    cfsMinGranularity: 4,
    cfsLatency: 24,
    contextSwitchOverhead: 1
  };
  
  simulationResult: SchedulerResult | null = null;
  currentTime = 0;
  totalTime = 0;
  mode: PlayMode = 'idle';
  speed = 500;
  timeUnitWidth = 18;
  
  compareMode = false;
  compareAlgorithms: string[] = ['fcfs', 'sjf'];
  compareResults: { algorithmName: string; result: SchedulerResult }[] = [];
  
  availableAlgorithms = ['fcfs', 'sjf', 'srtf', 'rr', 'priority', 'mlfq', 'cfs'] as any[];
  
  allAlgorithms = [
    { type: 'fcfs', name: 'FCFS' },
    { type: 'sjf', name: 'SJF' },
    { type: 'srtf', name: 'SRTF' },
    { type: 'rr', name: 'RR' },
    { type: 'priority', name: 'Priority' },
    { type: 'mlfq', name: 'MLFQ' },
    { type: 'cfs', name: 'CFS' }
  ];
  
  private playSubscription: Subscription | null = null;
  
  constructor(
    private schedulerService: SchedulerService,
    private processService: ProcessService
  ) {}
  
  ngOnInit(): void {
    this.processes = this.processService.getProcesses();
  }
  
  ngOnDestroy(): void {
    this.stopPlayback();
  }
  
  get canStartSimulation(): boolean {
    return this.processes.length > 0;
  }
  
  get processList(): Process[] {
    if (!this.simulationResult) return [];
    return Array.from(this.simulationResult.processes.values()).sort((a, b) => a.pid - b.pid);
  }
  
  get currentSnapshot(): QueueSnapshot | null {
    if (!this.simulationResult || this.currentTime < 0) return null;
    const idx = Math.min(this.currentTime, this.simulationResult.queueSnapshots.length - 1);
    return this.simulationResult.queueSnapshots[idx] || null;
  }
  
  onProcessesChange(processes: Process[]): void {
    this.processes = processes;
    if (this.mode === 'idle') {
      this.simulationResult = null;
    }
  }
  
  onAlgorithmConfigChange(config: AlgorithmConfig): void {
    this.algorithmConfig = config;
    if (this.mode === 'idle') {
      this.simulationResult = null;
    }
  }
  
  toggleCompareAlgo(algoType: string): void {
    const idx = this.compareAlgorithms.indexOf(algoType);
    if (idx > -1) {
      if (this.compareAlgorithms.length > 2) {
        this.compareAlgorithms.splice(idx, 1);
      }
    } else {
      if (this.compareAlgorithms.length < 4) {
        this.compareAlgorithms.push(algoType);
      }
    }
  }
  
  runSimulation(): void {
    if (this.compareMode) {
      this.runCompareSimulation();
    } else {
      this.simulationResult = this.schedulerService.runSimulation(this.processes, this.algorithmConfig);
      this.totalTime = this.simulationResult.totalTime;
    }
  }
  
  runCompareSimulation(): void {
    this.compareResults = [];
    
    for (const algoType of this.compareAlgorithms) {
      const config: AlgorithmConfig = {
        ...this.algorithmConfig,
        type: algoType as any,
        name: this.allAlgorithms.find(a => a.type === algoType)?.name || algoType
      };
      
      const result = this.schedulerService.runSimulation(this.processes, config);
      this.compareResults.push({
        algorithmName: config.name,
        result
      });
      
      this.totalTime = Math.max(this.totalTime, result.totalTime);
    }
    
    if (this.compareResults.length > 0) {
      this.simulationResult = this.compareResults[0].result;
    }
  }
  
  onPlay(): void {
    if (this.mode === 'idle') {
      this.runSimulation();
      this.currentTime = 0;
    }
    
    this.mode = 'playing';
    this.startPlayback();
  }
  
  onPause(): void {
    this.mode = 'paused';
    this.stopPlayback();
  }
  
  onStepForward(): void {
    if (this.mode === 'idle') {
      this.runSimulation();
      this.currentTime = 0;
      this.mode = 'paused';
    }
    
    if (this.currentTime < this.totalTime) {
      this.currentTime++;
      this.checkFinished();
    }
  }
  
  onStepBack(): void {
    if (this.currentTime > 0) {
      this.currentTime--;
      if (this.mode === 'finished') {
        this.mode = 'paused';
      }
    }
  }
  
  onJumpToEnd(): void {
    if (this.mode === 'idle') {
      this.runSimulation();
    }
    this.currentTime = this.totalTime;
    this.mode = 'finished';
  }
  
  onReset(): void {
    this.stopPlayback();
    this.mode = 'idle';
    this.currentTime = 0;
    this.totalTime = 0;
    this.simulationResult = null;
    this.compareResults = [];
  }
  
  onSeek(time: number): void {
    if (this.simulationResult && time <= this.totalTime) {
      this.currentTime = time;
      this.checkFinished();
    }
  }
  
  onSpeedChange(speed: number): void {
    this.speed = speed;
    if (this.mode === 'playing') {
      this.stopPlayback();
      this.startPlayback();
    }
  }
  
  private startPlayback(): void {
    this.stopPlayback();
    
    this.playSubscription = interval(this.speed).subscribe(() => {
      if (this.currentTime < this.totalTime) {
        this.currentTime++;
      } else {
        this.mode = 'finished';
        this.stopPlayback();
      }
    });
  }
  
  private stopPlayback(): void {
    if (this.playSubscription) {
      this.playSubscription.unsubscribe();
      this.playSubscription = null;
    }
  }
  
  private checkFinished(): void {
    if (this.currentTime >= this.totalTime) {
      this.mode = 'finished';
      this.stopPlayback();
    }
  }
  
  isBestValue(metric: string, value: number, higherIsBetter = false): boolean {
    if (!this.compareResults.length) return false;
    
    const values = this.compareResults.map(r => (r.result.stats as any)[metric]);
    const best = higherIsBetter ? Math.max(...values) : Math.min(...values);
    return value === best;
  }
  
  isWorstValue(metric: string, value: number, higherIsBetter = false): boolean {
    if (!this.compareResults.length) return false;
    
    const values = this.compareResults.map(r => (r.result.stats as any)[metric]);
    const worst = higherIsBetter ? Math.min(...values) : Math.max(...values);
    return value === worst;
  }
}
