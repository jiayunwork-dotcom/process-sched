import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type PlayMode = 'idle' | 'playing' | 'paused' | 'finished';

@Component({
  selector: 'app-playback-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card playback-card">
      <div class="playback-row">
        <div class="progress-section">
          <div class="progress-label">
            <span>时间: {{ currentTime }} / {{ totalTime }}</span>
            <span *ngIf="isPlaying" class="status-playing">▶ 运行中</span>
            <span *ngIf="isPaused" class="status-paused">⏸ 已暂停</span>
            <span *ngIf="isFinished" class="status-finished">✓ 已完成</span>
          </div>
          <div class="progress-bar" (click)="seekTo($event)">
            <div class="progress-fill" [style.width]="progressPercent + '%'"></div>
            <div class="progress-handle" [style.left]="progressPercent + '%'"></div>
          </div>
        </div>
        
        <div class="controls-section">
          <button class="btn btn-secondary btn-sm" (click)="onStepBack()" [disabled]="currentTime <= 0 || isPlaying">
            ⏮ 后退
          </button>
          <button class="btn btn-primary" (click)="togglePlay()" [disabled]="!canPlay">
            {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
          </button>
          <button class="btn btn-secondary btn-sm" (click)="onStepForward()" [disabled]="isFinished || isPlaying">
            ⏭ 单步
          </button>
          <button class="btn btn-success btn-sm" (click)="onJumpToEnd()" [disabled]="isFinished || isPlaying">
            ⏩ 跳到结束
          </button>
          <button class="btn btn-warning btn-sm" (click)="onReset()" [disabled]="isPlaying">
            ↺ 重置
          </button>
        </div>
      </div>
      
      <div class="settings-row">
        <div class="setting-group">
          <label>播放速度</label>
          <div class="speed-controls">
            <button 
              *ngFor="let s of speedOptions"
              class="speed-btn"
              [class.active]="s === currentSpeed"
              (click)="setSpeed(s)"
            >
              {{ s }}ms
            </button>
          </div>
        </div>
        <div class="setting-group">
          <label>自定义速度 (ms)</label>
          <input type="number" [(ngModel)]="customSpeed" (change)="applyCustomSpeed()" min="50" max="5000" step="50" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .playback-card {
      background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
    }
    
    .playback-row {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .progress-section {
      flex: 1;
    }
    
    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 13px;
      color: #475569;
    }
    
    .status-playing {
      color: #10b981;
      font-weight: 600;
      font-size: 12px;
    }
    
    .status-paused {
      color: #f59e0b;
      font-weight: 600;
      font-size: 12px;
    }
    
    .status-finished {
      color: #6366f1;
      font-weight: 600;
      font-size: 12px;
    }
    
    .progress-bar {
      position: relative;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      cursor: pointer;
      overflow: visible;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 4px;
      transition: width 0.1s linear;
    }
    
    .progress-handle {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background: white;
      border: 3px solid #667eea;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    
    .controls-section {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .settings-row {
      display: flex;
      gap: 24px;
      padding-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.05);
    }
    
    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .setting-group label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    
    .speed-controls {
      display: flex;
      gap: 4px;
    }
    
    .speed-btn {
      padding: 4px 10px;
      font-size: 11px;
      border: 1px solid #cbd5e0;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .speed-btn:hover {
      border-color: #667eea;
      color: #667eea;
    }
    
    .speed-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    
    .setting-group input {
      width: 100px;
      padding: 4px 8px;
      font-size: 12px;
    }
  `]
})
export class PlaybackControlComponent {
  @Input() currentTime = 0;
  @Input() totalTime = 0;
  @Input() mode: PlayMode = 'idle';
  @Input() canPlay = true;
  
  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() stepForward = new EventEmitter<void>();
  @Output() stepBack = new EventEmitter<void>();
  @Output() jumpToEnd = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() seek = new EventEmitter<number>();
  @Output() speedChange = new EventEmitter<number>();
  
  speedOptions = [100, 200, 500, 1000];
  customSpeed = 500;
  currentSpeed = 500;
  
  get isPlaying(): boolean {
    return this.mode === 'playing';
  }
  
  get isPaused(): boolean {
    return this.mode === 'paused';
  }
  
  get isFinished(): boolean {
    return this.mode === 'finished';
  }
  
  get progressPercent(): number {
    if (this.totalTime <= 0) return 0;
    return (this.currentTime / this.totalTime) * 100;
  }
  
  togglePlay(): void {
    if (this.isPlaying) {
      this.pause.emit();
    } else {
      this.play.emit();
    }
  }
  
  onStepBack(): void {
    this.stepBack.emit();
  }
  
  onStepForward(): void {
    this.stepForward.emit();
  }
  
  onJumpToEnd(): void {
    this.jumpToEnd.emit();
  }
  
  onReset(): void {
    this.reset.emit();
  }
  
  setSpeed(speed: number): void {
    this.currentSpeed = speed;
    this.customSpeed = speed;
    this.speedChange.emit(speed);
  }
  
  applyCustomSpeed(): void {
    const speed = Math.max(50, Math.min(5000, this.customSpeed));
    this.currentSpeed = speed;
    this.speedChange.emit(speed);
  }
  
  seekTo(event: MouseEvent): void {
    if (this.isPlaying) return;
    
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const time = Math.round(percent * this.totalTime);
    this.seek.emit(Math.max(0, Math.min(this.totalTime, time)));
  }
}
