import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ProcessPanelComponent } from '../process-panel/process-panel.component';
import { AlgorithmSelectorComponent } from '../algorithm-selector/algorithm-selector.component';
import { GanttChartComponent } from '../gantt-chart/gantt-chart.component';
import { ReadyQueueComponent } from '../ready-queue/ready-queue.component';
import { PlaybackControlComponent, PlayMode } from '../playback-control/playback-control.component';
import { StatsPanelComponent } from '../stats-panel/stats-panel.component';

import { Level } from '../../models/level.model';
import { Process, AlgorithmConfig, SchedulerResult } from '../../models/process.model';
import { LevelService } from '../../services/level.service';
import { SchedulerService } from '../../services/scheduler.service';
import { ProcessService } from '../../services/process.service';
import { getColor, generateProcessName } from '../../utils/helpers';

@Component({
  selector: 'app-levels',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProcessPanelComponent,
    AlgorithmSelectorComponent,
    GanttChartComponent,
    ReadyQueueComponent,
    PlaybackControlComponent,
    StatsPanelComponent
  ],
  template: `
    <div class="levels-container">
      <div class="levels-sidebar" *ngIf="!selectedLevel">
        <div class="card">
          <div class="card-title">🎯 教学关卡</div>
          <p class="levels-desc">选择一个关卡开始学习，从基础到高级逐步掌握进程调度算法。</p>
        </div>
        
        <div class="level-groups">
          <div class="level-group" *ngFor="let group of levelGroups">
            <h3 class="group-title">{{ group.title }}</h3>
            <div class="level-cards">
              <div 
                *ngFor="let level of group.levels"
                class="level-card"
                [class.easy]="level.difficulty === 'easy'"
                [class.medium]="level.difficulty === 'medium'"
                [class.hard]="level.difficulty === 'hard'"
                [class.completed]="completedLevels.includes(level.id)"
                (click)="selectLevel(level)"
              >
                <div class="level-number">{{ level.id }}</div>
                <div class="level-info">
                  <div class="level-title">{{ level.title }}</div>
                  <div class="level-diff">
                    <span class="diff-badge">{{ difficultyText(level.difficulty) }}</span>
                    <span class="check" *ngIf="completedLevels.includes(level.id)">✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="level-detail" *ngIf="selectedLevel">
        <button class="back-btn" (click)="selectedLevel = null">
          ← 返回关卡列表
        </button>
        
        <div class="card level-header-card">
          <div class="level-header">
            <div class="level-badge">第 {{ selectedLevel.id }} 关</div>
            <h2>{{ selectedLevel.title }}</h2>
            <span class="diff-badge large" [class.easy]="selectedLevel.difficulty === 'easy'"
                  [class.medium]="selectedLevel.difficulty === 'medium'"
                  [class.hard]="selectedLevel.difficulty === 'hard'">
              {{ difficultyText(selectedLevel.difficulty) }}
            </span>
          </div>
          <p class="level-desc">{{ selectedLevel.description }}</p>
          
          <div class="goal-box">
            <span class="goal-icon">🎯</span>
            <div>
              <strong>目标：</strong>
              {{ selectedLevel.goal.description }}
            </div>
          </div>
          
          <div class="hint-box" *ngIf="showHint">
            <span class="hint-icon">💡</span>
            <div>
              <strong>提示：</strong>
              {{ selectedLevel.hint }}
            </div>
          </div>
          <button class="hint-btn" (click)="showHint = !showHint">
            {{ showHint ? '隐藏提示' : '显示提示' }}
          </button>
        </div>
        
        <div class="level-content">
          <div class="left-col">
            <div class="card">
              <div class="card-title">
                <span>📋 关卡进程</span>
                <span class="readonly-badge">只读</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>进程</th>
                    <th>到达时间</th>
                    <th>CPU时长</th>
                    <th>IO时长</th>
                    <th>优先级</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of levelProcesses">
                    <td>
                      <span class="color-dot" [style.background]="p.color"></span>
                    </td>
                    <td>{{ p.name }}</td>
                    <td>{{ p.arrivalTime }}</td>
                    <td>{{ p.cpuBurst }}</td>
                    <td>{{ p.ioBurst }}</td>
                    <td>{{ p.priority }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <app-algorithm-selector
              [availableAlgorithms]="selectedLevel.availableAlgorithms"
              [initialConfig]="algorithmConfig"
              (configChange)="onAlgorithmConfigChange($event)"
            ></app-algorithm-selector>
          </div>
          
          <div class="right-col">
            <app-playback-control
              [currentTime]="currentTime"
              [totalTime]="totalTime"
              [mode]="mode"
              [canPlay]="true"
              (play)="onPlay()"
              (pause)="onPause()"
              (stepForward)="onStepForward()"
              (stepBack)="onStepBack()"
              (jumpToEnd)="onJumpToEnd()"
              (reset)="onReset()"
              (seek)="onSeek($event)"
              (speedChange)="onSpeedChange($event)"
            ></app-playback-control>
            
            <app-gantt-chart
              [result]="simulationResult"
              [currentTime]="currentTime"
              [showMarker]="mode !== 'idle'"
              [timeUnitWidth]="timeUnitWidth"
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
            
            <div class="result-card" [class.success]="goalMet" [class.fail]="!goalMet && mode === 'finished'">
              <div class="result-icon">{{ goalMet ? '🎉' : '📊' }}</div>
              <div>
                <h4>{{ goalMet ? '恭喜！目标达成！' : '当前结果' }}</h4>
                <p>{{ goalText }}</p>
              </div>
              <button 
                class="btn btn-primary" 
                *ngIf="goalMet && !completedLevels.includes(selectedLevel.id)"
                (click)="completeLevel()"
              >
                完成关卡
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .levels-container {
      display: flex;
      gap: 16px;
      min-height: calc(100vh - 130px);
    }
    
    .levels-sidebar {
      width: 100%;
    }
    
    .levels-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    
    .level-groups {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .level-group {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .group-title {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .level-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }
    
    .level-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
    }
    
    .level-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }
    
    .level-card.completed {
      background: #f0fdf4;
      border-color: #86efac;
    }
    
    .level-number {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #e0e7ff;
      color: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .level-card.easy .level-number { background: #d1fae5; color: #059669; }
    .level-card.medium .level-number { background: #fef3c7; color: #d97706; }
    .level-card.hard .level-number { background: #fee2e2; color: #dc2626; }
    
    .level-info {
      flex: 1;
      min-width: 0;
    }
    
    .level-title {
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    
    .level-diff {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .diff-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #e2e8f0;
      color: #475569;
    }
    
    .diff-badge.easy { background: #d1fae5; color: #059669; }
    .diff-badge.medium { background: #fef3c7; color: #d97706; }
    .diff-badge.hard { background: #fee2e2; color: #dc2626; }
    .diff-badge.large { font-size: 12px; padding: 4px 12px; }
    
    .check {
      color: #10b981;
      font-weight: bold;
    }
    
    .level-detail {
      width: 100%;
    }
    
    .back-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 14px;
      cursor: pointer;
      margin-bottom: 12px;
      padding: 4px 0;
    }
    
    .back-btn:hover {
      text-decoration: underline;
    }
    
    .level-header-card {
      margin-bottom: 16px;
    }
    
    .level-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    
    .level-badge {
      font-size: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 600;
    }
    
    .level-header h2 {
      margin: 0;
      font-size: 20px;
      color: #1e293b;
    }
    
    .level-desc {
      color: #64748b;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }
    
    .goal-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #eff6ff;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      border-left: 4px solid #3b82f6;
    }
    
    .goal-icon, .hint-icon {
      font-size: 20px;
    }
    
    .hint-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #fefce8;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      border-left: 4px solid #eab308;
    }
    
    .hint-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
    }
    
    .level-content {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 16px;
    }
    
    .left-col, .right-col {
      min-width: 0;
    }
    
    .readonly-badge {
      font-size: 11px;
      background: #e2e8f0;
      color: #64748b;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: normal;
    }
    
    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 16px;
    }
    
    .result-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      margin-top: 16px;
      border: 2px solid #e2e8f0;
    }
    
    .result-card.success {
      background: #f0fdf4;
      border-color: #86efac;
    }
    
    .result-card.fail {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    
    .result-icon {
      font-size: 36px;
    }
    
    .result-card h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
    }
    
    .result-card p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
    }
    
    .result-card .btn {
      margin-left: auto;
    }
  `]
})
export class LevelsComponent implements OnInit {
  levels: Level[] = [];
  selectedLevel: Level | null = null;
  completedLevels: number[] = [];
  
  levelGroups = [
    { title: '基础篇 - FCFS 与 SJF', levels: [] as Level[] },
    { title: '进阶篇 - RR 与优先级', levels: [] as Level[] },
    { title: '高级篇 - MLFQ 与 CFS', levels: [] as Level[] }
  ];
  
  levelProcesses: Process[] = [];
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
  showHint = false;
  
  goalMet = false;
  goalText = '';
  
  private playSubscription: any = null;
  
  constructor(
    private levelService: LevelService,
    private schedulerService: SchedulerService,
    private processService: ProcessService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.levels = this.levelService.getLevels();
    this.groupLevels();
    this.loadProgress();
  }
  
  groupLevels(): void {
    this.levelGroups[0].levels = this.levels.filter(l => l.id <= 3);
    this.levelGroups[1].levels = this.levels.filter(l => l.id >= 4 && l.id <= 9);
    this.levelGroups[2].levels = this.levels.filter(l => l.id >= 10);
  }
  
  loadProgress(): void {
    const saved = localStorage.getItem('process-sched-levels');
    if (saved) {
      this.completedLevels = JSON.parse(saved);
    }
  }
  
  saveProgress(): void {
    localStorage.setItem('process-sched-levels', JSON.stringify(this.completedLevels));
  }
  
  difficultyText(diff: string): string {
    const map: Record<string, string> = {
      'easy': '简单',
      'medium': '中等',
      'hard': '困难'
    };
    return map[diff] || diff;
  }
  
  selectLevel(level: Level): void {
    this.selectedLevel = level;
    this.mode = 'idle';
    this.currentTime = 0;
    this.totalTime = 0;
    this.simulationResult = null;
    this.goalMet = false;
    this.showHint = false;
    this.goalText = '';
    
    this.levelProcesses = level.processes.map((p, i) => ({
      ...p,
      pid: i + 1,
      color: getColor(i),
      name: generateProcessName(i + 1),
      remainingCpu: p.cpuBurst,
      remainingIo: 0,
      status: 'not_arrived' as any,
      startTime: 0,
      completionTime: 0,
      waitingTime: 0,
      turnaroundTime: 0,
      responseTime: 0,
      firstResponseTime: -1,
      hasStarted: false,
      vruntime: 0,
      weight: 1024,
      currentQueueLevel: 0,
      timeSliceRemaining: 0,
      cpuExecutedInSlice: 0,
      lastIoTriggerTime: -1
    }));
    
    this.algorithmConfig = {
      type: level.defaultAlgorithm,
      name: level.defaultAlgorithm.toUpperCase(),
      timeQuantum: level.adjustableParams.timeQuantum?.default ?? 4,
      preemptive: false,
      mlfqLevels: level.adjustableParams.mlfqLevels?.default ?? 3,
      mlfqTimeSlices: [8, 16, 32, 64, 128].slice(0, level.adjustableParams.mlfqLevels?.default ?? 3),
      mlfqBoostInterval: level.adjustableParams.mlfqBoostInterval?.default ?? 30,
      mlfqBottomPolicy: 'fcfs',
      cfsMinGranularity: level.adjustableParams.cfsMinGranularity?.default ?? 4,
      cfsLatency: level.adjustableParams.cfsLatency?.default ?? 24,
      contextSwitchOverhead: level.adjustableParams.contextSwitchOverhead?.default ?? 1
    };
  }
  
  onAlgorithmConfigChange(config: AlgorithmConfig): void {
    this.algorithmConfig = config;
    if (this.mode === 'idle') {
      this.simulationResult = null;
      this.goalMet = false;
    }
  }
  
  get processList(): Process[] {
    if (!this.simulationResult) return [];
    return Array.from(this.simulationResult.processes.values()).sort((a, b) => a.pid - b.pid);
  }
  
  get currentSnapshot(): any {
    if (!this.simulationResult || this.currentTime < 0) return null;
    const idx = Math.min(this.currentTime, this.simulationResult.queueSnapshots.length - 1);
    return this.simulationResult.queueSnapshots[idx] || null;
  }
  
  runSimulation(): void {
    this.simulationResult = this.schedulerService.runSimulation(this.levelProcesses, this.algorithmConfig);
    this.totalTime = this.simulationResult.totalTime;
    this.checkGoal();
  }
  
  checkGoal(): void {
    if (!this.simulationResult || !this.selectedLevel) {
      this.goalMet = false;
      this.goalText = '';
      return;
    }
    
    const stats = this.simulationResult.stats;
    const goal = this.selectedLevel.goal;
    
    this.goalMet = this.levelService.checkLevelGoal(this.selectedLevel, stats);
    
    let actual = '';
    switch (goal.type) {
      case 'min_avg_wait':
        actual = `平均等待时间: ${stats.avgWaitingTime.toFixed(2)} (目标: < ${goal.targetValue})`;
        break;
      case 'min_avg_turnaround':
        actual = `平均周转时间: ${stats.avgTurnaroundTime.toFixed(2)} (目标: < ${goal.targetValue})`;
        break;
      case 'min_avg_response':
        actual = `平均响应时间: ${stats.avgResponseTime.toFixed(2)} (目标: < ${goal.targetValue})`;
        break;
      case 'max_cpu_util':
        actual = `CPU 利用率: ${stats.cpuUtilization.toFixed(1)}% (目标: > ${goal.targetValue}%)`;
        break;
      default:
        actual = goal.description;
    }
    this.goalText = actual;
  }
  
  completeLevel(): void {
    if (this.selectedLevel && !this.completedLevels.includes(this.selectedLevel.id)) {
      this.completedLevels.push(this.selectedLevel.id);
      this.saveProgress();
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
    this.goalMet = false;
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
    
    this.playSubscription = setInterval(() => {
      if (this.currentTime < this.totalTime) {
        this.currentTime++;
      } else {
        this.mode = 'finished';
        this.stopPlayback();
      }
    }, this.speed);
  }
  
  private stopPlayback(): void {
    if (this.playSubscription) {
      clearInterval(this.playSubscription);
      this.playSubscription = null;
    }
  }
  
  private checkFinished(): void {
    if (this.currentTime >= this.totalTime) {
      this.mode = 'finished';
      this.stopPlayback();
    }
  }
}
