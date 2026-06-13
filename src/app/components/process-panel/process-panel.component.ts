import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Process, IoMode } from '../../models/process.model';
import { ProcessService } from '../../services/process.service';
import { COLORS, getColor } from '../../utils/helpers';

@Component({
  selector: 'app-process-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="card-title">
        <span>📋 进程配置</span>
        <span class="process-count">{{ processes.length }} 个进程</span>
      </div>
      
      <div class="form-row">
        <button class="btn btn-primary btn-sm" (click)="showAddForm = !showAddForm">
          {{ showAddForm ? '取消' : '+ 添加进程' }}
        </button>
        <button class="btn btn-secondary btn-sm" (click)="generateRandom()">
          🎲 随机生成
        </button>
        <button class="btn btn-danger btn-sm" (click)="clearAll()" [disabled]="processes.length === 0">
          🗑️ 清空
        </button>
      </div>
      
      <div class="random-config" *ngIf="showRandomConfig">
        <div class="form-row">
          <div class="form-group">
            <label>进程数量</label>
            <input type="number" [(ngModel)]="randomCount" min="5" max="15" />
          </div>
          <div class="form-group">
            <label>到达时间范围</label>
            <div class="range-inputs">
              <input type="number" [(ngModel)]="randomArrivalMin" min="0" max="20" />
              <span>-</span>
              <input type="number" [(ngModel)]="randomArrivalMax" min="0" max="50" />
            </div>
          </div>
          <div class="form-group">
            <label>CPU时长范围</label>
            <div class="range-inputs">
              <input type="number" [(ngModel)]="randomCpuMin" min="1" max="50" />
              <span>-</span>
              <input type="number" [(ngModel)]="randomCpuMax" min="1" max="50" />
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>IO时长范围</label>
            <div class="range-inputs">
              <input type="number" [(ngModel)]="randomIoMin" min="0" max="30" />
              <span>-</span>
              <input type="number" [(ngModel)]="randomIoMax" min="0" max="30" />
            </div>
          </div>
          <div class="form-group">
            <label>优先级范围</label>
            <div class="range-inputs">
              <input type="number" [(ngModel)]="randomPrioMin" min="1" max="10" />
              <span>-</span>
              <input type="number" [(ngModel)]="randomPrioMax" min="1" max="10" />
            </div>
          </div>
          <button class="btn btn-primary btn-sm" (click)="doGenerate()">
            生成
          </button>
        </div>
      </div>
      
      <div class="add-form" *ngIf="showAddForm">
        <h4>{{ editingPid ? '编辑进程' : '添加新进程' }}</h4>
        <div class="form-row">
          <div class="form-group">
            <label>到达时间</label>
            <input type="number" [(ngModel)]="newProcess.arrivalTime" min="0" max="100" />
          </div>
          <div class="form-group">
            <label>CPU突发时长</label>
            <input type="number" [(ngModel)]="newProcess.cpuBurst" min="1" max="50" />
          </div>
          <div class="form-group">
            <label>IO突发时长</label>
            <input type="number" [(ngModel)]="newProcess.ioBurst" min="0" max="30" />
          </div>
          <div class="form-group">
            <label>优先级</label>
            <input type="number" [(ngModel)]="newProcess.priority" min="1" max="10" />
          </div>
          <div class="form-group">
            <label>Nice值</label>
            <input type="number" [(ngModel)]="newProcess.nice" min="-5" max="5" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>IO模式</label>
            <select [(ngModel)]="newProcess.ioMode">
              <option value="none">无 IO</option>
              <option value="periodic">周期性</option>
              <option value="probabilistic">随机概率</option>
            </select>
          </div>
          <div class="form-group" *ngIf="newProcess.ioMode === 'periodic'">
            <label>IO周期</label>
            <input type="number" [(ngModel)]="newProcess.ioPeriod" min="1" max="50" />
          </div>
          <div class="form-group" *ngIf="newProcess.ioMode === 'probabilistic'">
            <label>IO概率(%)</label>
            <input type="number" [(ngModel)]="newProcess.ioProbability" min="1" max="100" />
          </div>
          <div class="form-group">
            <label>颜色</label>
            <div class="color-picker">
              <span 
                *ngFor="let color of COLORS; let i = index"
                class="color-option"
                [class.selected]="newProcess.color === color"
                [style.background]="color"
                (click)="newProcess.color = color"
              ></span>
            </div>
          </div>
        </div>
        <div class="form-row">
          <button class="btn btn-primary btn-sm" (click)="addOrUpdate()">
            {{ editingPid ? '保存' : '添加' }}
          </button>
          <button class="btn btn-secondary btn-sm" (click)="cancelEdit()">
            取消
          </button>
        </div>
      </div>
      
      <div class="process-table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>进程</th>
              <th>到达时间</th>
              <th>CPU时长</th>
              <th>IO时长</th>
              <th>优先级</th>
              <th>Nice</th>
              <th>IO模式</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of processes">
              <td>
                <span class="color-dot" [style.background]="p.color"></span>
              </td>
              <td>{{ p.name }}</td>
              <td>{{ p.arrivalTime }}</td>
              <td>{{ p.cpuBurst }}</td>
              <td>{{ p.ioBurst }}</td>
              <td>{{ p.priority }}</td>
              <td>{{ p.nice }}</td>
              <td>
                <span class="io-mode-tag" [class.none]="p.ioMode === 'none'">
                  {{ p.ioMode === 'none' ? '无' : p.ioMode === 'periodic' ? '周期' : '随机' }}
                </span>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm" (click)="editProcess(p)">编辑</button>
                <button class="btn btn-danger btn-sm" (click)="removeProcess(p.pid)">删除</button>
              </td>
            </tr>
            <tr *ngIf="processes.length === 0">
              <td colspan="9" class="empty">暂无进程，请添加或随机生成</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .card {
      margin-bottom: 16px;
    }
    
    .card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .process-count {
      font-size: 12px;
      color: #64748b;
      font-weight: normal;
      background: #e0e7ff;
      padding: 2px 10px;
      border-radius: 12px;
    }
    
    .add-form, .random-config {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    
    .add-form h4 {
      margin-bottom: 8px;
      font-size: 14px;
      color: #334155;
    }
    
    .range-inputs {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .range-inputs input {
      width: 60px;
    }
    
    .range-inputs span {
      color: #94a3b8;
    }
    
    .color-picker {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      max-width: 200px;
    }
    
    .color-option {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.1s;
    }
    
    .color-option:hover {
      transform: scale(1.15);
    }
    
    .color-option.selected {
      border-color: #333;
    }
    
    .process-table-container {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .io-mode-tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #dbeafe;
      color: #1d4ed8;
    }
    
    .io-mode-tag.none {
      background: #e2e8f0;
      color: #64748b;
    }
    
    .empty {
      text-align: center;
      color: #94a3b8;
      padding: 24px !important;
    }
  `]
})
export class ProcessPanelComponent implements OnInit {
  @Input() readOnly = false;
  @Output() processesChange = new EventEmitter<Process[]>();
  
  processes: Process[] = [];
  showAddForm = false;
  showRandomConfig = false;
  editingPid: number | null = null;
  COLORS = COLORS;
  
  newProcess: any = {
    arrivalTime: 0,
    cpuBurst: 10,
    ioBurst: 0,
    priority: 5,
    nice: 0,
    ioMode: 'none' as IoMode,
    ioPeriod: 5,
    ioProbability: 10,
    color: COLORS[0]
  };
  
  randomCount = 8;
  randomArrivalMin = 0;
  randomArrivalMax = 10;
  randomCpuMin = 5;
  randomCpuMax = 30;
  randomIoMin = 0;
  randomIoMax = 10;
  randomPrioMin = 1;
  randomPrioMax = 10;
  
  constructor(private processService: ProcessService) {}
  
  ngOnInit(): void {
    this.loadProcesses();
  }
  
  loadProcesses(): void {
    this.processes = this.processService.getProcesses();
    this.processesChange.emit(this.processes);
  }
  
  addOrUpdate(): void {
    if (this.editingPid) {
      this.processService.updateProcess(this.editingPid, this.newProcess);
    } else {
      this.processService.addProcess(this.newProcess);
    }
    this.loadProcesses();
    this.cancelEdit();
  }
  
  editProcess(p: Process): void {
    this.editingPid = p.pid;
    this.showAddForm = true;
    this.newProcess = { ...p };
  }
  
  cancelEdit(): void {
    this.showAddForm = false;
    this.editingPid = null;
    this.resetNewProcess();
  }
  
  resetNewProcess(): void {
    const nextIdx = this.processes.length;
    this.newProcess = {
      arrivalTime: 0,
      cpuBurst: 10,
      ioBurst: 0,
      priority: 5,
      nice: 0,
      ioMode: 'none' as IoMode,
      ioPeriod: 5,
      ioProbability: 10,
      color: getColor(nextIdx)
    };
  }
  
  removeProcess(pid: number): void {
    this.processService.removeProcess(pid);
    this.loadProcesses();
  }
  
  clearAll(): void {
    if (confirm('确定要清空所有进程吗？')) {
      this.processService.clearAll();
      this.loadProcesses();
    }
  }
  
  generateRandom(): void {
    this.showRandomConfig = !this.showRandomConfig;
  }
  
  doGenerate(): void {
    this.processService.generateRandom(this.randomCount, {
      arrivalMin: this.randomArrivalMin,
      arrivalMax: this.randomArrivalMax,
      cpuMin: this.randomCpuMin,
      cpuMax: this.randomCpuMax,
      ioMin: this.randomIoMin,
      ioMax: this.randomIoMax,
      priorityMin: this.randomPrioMin,
      priorityMax: this.randomPrioMax
    });
    this.loadProcesses();
    this.showRandomConfig = false;
  }
}
