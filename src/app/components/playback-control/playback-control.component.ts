import { Component, Output, EventEmitter, Input, ViewChild, ElementRef, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type PlayMode = 'idle' | 'playing' | 'paused' | 'finished';

@Component({
  selector: 'app-playback-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card playback-card">
      <div class="controls-row">
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
        
        <div class="status-section">
          <span *ngIf="isPlaying" class="status-playing">▶ 运行中</span>
          <span *ngIf="isPaused" class="status-paused">⏸ 已暂停</span>
          <span *ngIf="isFinished" class="status-finished">✓ 已完成</span>
          <span *ngIf="isIdle" class="status-idle">○ 待开始</span>
        </div>
      </div>
      
      <div class="slider-row">
        <div class="time-label time-current">{{ dragTime !== null ? dragTime : currentTime }}</div>
        <div 
          class="slider-container"
          #sliderContainer
          (mousedown)="onSliderMouseDown($event)"
          (touchstart)="onSliderTouchStart($event)"
        >
          <div class="slider-track">
            <div class="slider-fill" [style.width]="(dragTime !== null ? (dragTime / totalTime * 100) : progressPercent) + '%'"></div>
          </div>
          <div 
            class="slider-ticks"
            *ngIf="totalTime > 0"
          >
            <div 
              *ngFor="let tick of sliderTicks" 
              class="slider-tick"
              [class.major]="tick.isMajor"
              [style.left]="(tick.value / totalTime * 100) + '%'"
            ></div>
          </div>
          <div 
            class="slider-handle"
            [class.dragging]="isDragging"
            [style.left]="(dragTime !== null ? (dragTime / totalTime * 100) : progressPercent) + '%'"
          >
            <div class="handle-inner"></div>
          </div>
        </div>
        <div class="time-label time-total">{{ totalTime }}</div>
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
    
    .controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .controls-section {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .status-section {
      display: flex;
      align-items: center;
    }
    
    .status-playing {
      color: #10b981;
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .status-paused {
      color: #f59e0b;
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .status-finished {
      color: #6366f1;
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .status-idle {
      color: #94a3b8;
      font-weight: 500;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .slider-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
      padding: 0 4px;
    }
    
    .time-label {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      min-width: 36px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    
    .time-current {
      color: #667eea;
      background: white;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #c7d2fe;
      box-shadow: 0 1px 3px rgba(102, 126, 234, 0.1);
    }
    
    .time-total {
      color: #64748b;
      background: white;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    
    .slider-container {
      flex: 1;
      position: relative;
      height: 32px;
      cursor: pointer;
      touch-action: none;
      user-select: none;
    }
    
    .slider-track {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 8px;
      margin-top: -4px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
    }
    
    .slider-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      transition: width 0.05s linear;
    }
    
    .slider-ticks {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 8px;
      margin-top: -4px;
      pointer-events: none;
    }
    
    .slider-tick {
      position: absolute;
      top: 50%;
      width: 1px;
      height: 100%;
      background: rgba(148, 163, 184);
      opacity: 0.4;
      transform: translateX(-0.5px);
    }
    
    .slider-tick.major {
      height: 150%;
      top: -25%;
      width: 2px;
      opacity: 0.7;
      background: #94a3b8;
    }
    
    .slider-handle {
      position: absolute;
      top: 50%;
      left: 0;
      width: 0;
      height: 0;
      margin-top: -12px;
      z-index: 10;
      transition: transform 0.05s ease;
    }
    
    .slider-handle.dragging {
      transform: scale(1.25);
      z-index: 20;
    }
    
    .handle-inner {
      position: absolute;
      top: 0;
      left: 0;
      width: 22px;
      height: 22px;
      margin-left: -11px;
      background: white;
      border: 3px solid #667eea;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.35);
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
    }
    
    .slider-container:hover .handle-inner,
    .slider-handle.dragging .handle-inner {
      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.5);
      border-color: #5a67d8;
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
export class PlaybackControlComponent implements OnChanges {
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
  
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;
  
  speedOptions = [100, 200, 500, 1000];
  customSpeed = 500;
  currentSpeed = 500;
  
  isDragging = false;
  dragTime: number | null = null;
  sliderTicks: { value: number; isMajor: boolean }[] = [];
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalTime']) {
      this.generateSliderTicks();
    }
  }
  
  generateSliderTicks(): void {
    if (this.totalTime <= 0) {
      this.sliderTicks = [];
      return;
    }
    const ticks: { value: number; isMajor: boolean }[] = [];
    let step = 1;
    if (this.totalTime > 100) step = 10;
    else if (this.totalTime > 50) step = 5;
    else if (this.totalTime > 20) step = 2;
    
    const majorStep = Math.max(step * 5, 5);
    
    for (let t = 0; t <= this.totalTime; t += step) {
      ticks.push({
        value: t,
        isMajor: t % majorStep === 0
      });
    }
    if (ticks[ticks.length - 1].value !== this.totalTime) {
      ticks.push({ value: this.totalTime, isMajor: true });
    }
    this.sliderTicks = ticks;
  }
  
  get isPlaying(): boolean {
    return this.mode === 'playing';
  }
  
  get isPaused(): boolean {
    return this.mode === 'paused';
  }
  
  get isFinished(): boolean {
    return this.mode === 'finished';
  }
  
  get isIdle(): boolean {
    return this.mode === 'idle';
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
  
  private getTimeFromEvent(clientX: number): number {
    if (!this.sliderContainer || this.totalTime <= 0) return 0;
    const el = this.sliderContainer.nativeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(percent * this.totalTime);
  }
  
  onSliderMouseDown(event: MouseEvent): void {
    if (this.totalTime <= 0) return;
    event.preventDefault();
    this.isDragging = true;
    const time = this.getTimeFromEvent(event.clientX);
    this.dragTime = time;
    this.seek.emit(time);
  }
  
  onSliderTouchStart(event: TouchEvent): void {
    if (this.totalTime <= 0) return;
    event.preventDefault();
    this.isDragging = true;
    const touch = event.touches[0];
    const time = this.getTimeFromEvent(touch.clientX);
    this.dragTime = time;
    this.seek.emit(time);
  }
  
  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const time = this.getTimeFromEvent(event.clientX);
    if (time !== this.dragTime) {
      this.dragTime = time;
      this.seek.emit(time);
    }
  }
  
  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    const touch = event.touches[0];
    const time = this.getTimeFromEvent(touch.clientX);
    if (time !== this.dragTime) {
      this.dragTime = time;
      this.seek.emit(time);
    }
  }
  
  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTime = null;
    }
  }
  
  @HostListener('document:touchend')
  onDocumentTouchEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTime = null;
    }
  }
}
