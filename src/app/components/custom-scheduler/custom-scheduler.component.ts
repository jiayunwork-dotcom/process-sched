import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Process, SchedulerResult, AlgorithmConfig, SchedulerStats } from '../../models/process.model';
import { 
  CustomSchedulerPolicy, 
  SchedulerRule, 
  SchedulerCondition, 
  SchedulerAction,
  ConditionType,
  ActionType,
  ComparisonOperator,
  CONDITION_LABELS,
  ACTION_LABELS,
  COMPARISON_OPERATORS,
  generateRuleId,
  generatePolicyId,
  getRuleDescription,
  getConditionDescription,
  getActionDescription
} from '../../models/custom-scheduler.model';
import { CustomSchedulerService } from '../../services/custom-scheduler.service';
import { PolicyStorageService } from '../../services/policy-storage.service';
import { ProcessService } from '../../services/process.service';
import { SchedulerService } from '../../services/scheduler.service';

@Component({
  selector: 'app-custom-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="custom-scheduler-container">
      <div class="saved-policies-bar">
        <div class="bar-title">
          <span class="icon">💾</span>
          <span>已保存策略</span>
        </div>
        <div class="policy-list" *ngIf="savedPolicies.length > 0">
          <div 
            *ngFor="let policy of savedPolicies" 
            class="policy-chip"
            [class.active]="currentPolicy.id === policy.id"
            (click)="loadPolicy(policy)"
            (mousedown)="startPressTimer(policy.id)"
            (mouseup)="clearPressTimer()"
            (mouseleave)="clearPressTimer()"
          >
            {{ policy.name }}
            <span class="rule-count">({{ policy.rules.length }}条规则)</span>
          </div>
        </div>
        <div class="empty-hint" *ngIf="savedPolicies.length === 0">
          还没有自定义策略，试着创建一个吧 ✨
        </div>
      </div>

      <div class="editor-layout">
        <div class="left-panel">
          <div class="card">
            <div class="card-title">
              <span>📝 规则编辑器</span>
              <span class="hint-text">拖拽或使用按钮调整规则优先级</span>
            </div>
            
            <div class="rules-container">
              <div 
                *ngFor="let rule of currentPolicy.rules; let i = index" 
                class="rule-card"
                [class.dragging]="draggedRuleIndex === i"
                draggable="true"
                (dragstart)="onDragStart($event, i)"
                (dragover)="onDragOver($event, i)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event, i)"
                (dragend)="onDragEnd()"
              >
                <div class="rule-header">
                  <span class="rule-number">规则 {{ i + 1 }}</span>
                  <div class="rule-actions">
                    <button 
                      class="btn-icon" 
                      (click)="moveRuleUp(i)" 
                      [disabled]="i === 0"
                      title="上移"
                    >↑</button>
                    <button 
                      class="btn-icon" 
                      (click)="moveRuleDown(i)" 
                      [disabled]="i === currentPolicy.rules.length - 1"
                      title="下移"
                    >↓</button>
                    <button 
                      class="btn-icon btn-delete" 
                      (click)="deleteRule(i)"
                      title="删除"
                    >✕</button>
                  </div>
                </div>

                <div class="rule-body">
                  <div class="conditions-section">
                    <div class="section-label">触发条件 (AND)</div>
                    <div class="conditions-list">
                      <div 
                        *ngFor="let cond of rule.conditions; let ci = index" 
                        class="condition-item"
                      >
                        <select 
                          [(ngModel)]="cond.type" 
                          class="condition-type-select"
                          (change)="onConditionTypeChange(rule, ci)"
                        >
                          <option *ngFor="let ct of conditionTypes" [value]="ct.value">
                            {{ ct.label }}
                          </option>
                        </select>
                        
                        <ng-container *ngIf="needsOperator(cond.type)">
                          <select [(ngModel)]="cond.operator" class="operator-select">
                            <option *ngFor="let op of COMPARISON_OPERATORS" [value]="op.value">
                              {{ op.label }}
                            </option>
                          </select>
                          <input 
                            type="number" 
                            [(ngModel)]="cond.value" 
                            class="value-input"
                            min="0"
                          />
                        </ng-container>
                        
                        <button 
                          class="btn-icon btn-delete-small" 
                          (click)="removeCondition(rule, ci)"
                          title="删除条件"
                          *ngIf="rule.conditions.length > 1"
                        >✕</button>
                      </div>
                    </div>
                    <button 
                      class="btn btn-secondary btn-sm add-condition-btn"
                      (click)="addCondition(rule)"
                    >
                      + 添加条件
                    </button>
                  </div>

                  <div class="action-section">
                    <div class="section-label">执行动作</div>
                    <select [(ngModel)]="rule.action.type" class="action-select">
                      <option *ngFor="let at of actionTypes" [value]="at.value">
                        {{ at.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="rule-summary">
                  <span class="summary-label">规则描述：</span>
                  <span class="summary-text">{{ getRuleDescription(rule) }}</span>
                </div>
              </div>

              <div class="empty-rules" *ngIf="currentPolicy.rules.length === 0">
                <div class="empty-icon">📋</div>
                <div class="empty-text">暂无规则，点击下方按钮添加第一条规则</div>
              </div>
            </div>

            <button class="btn btn-primary add-rule-btn" (click)="addRule()">
              + 添加规则
            </button>
          </div>

          <div class="card save-section">
            <div class="card-title">
              <span>💾 保存策略</span>
            </div>
            <div class="save-form">
              <div class="form-group">
                <label>策略名称</label>
                <input 
                  type="text" 
                  [(ngModel)]="policyName" 
                  placeholder="输入策略名称..."
                  class="name-input"
                />
              </div>
              <button class="btn btn-primary save-btn" (click)="saveCurrentPolicy()">
                {{ currentPolicy.id ? '更新策略' : '保存策略' }}
              </button>
              <button 
                class="btn btn-secondary reset-btn" 
                (click)="resetEditor()"
                *ngIf="currentPolicy.id"
              >
                新建策略
              </button>
            </div>
          </div>
        </div>

        <div class="right-panel">
          <div class="card policy-preview-card">
            <div class="card-title">
              <span>👁️ 策略预览</span>
            </div>
            <div class="policy-info">
              <div class="policy-name">
                <span class="label">策略名称：</span>
                <span class="value">{{ policyName || '未命名策略' }}</span>
              </div>
              <div class="rule-count-info">
                <span class="label">规则数量：</span>
                <span class="value">{{ currentPolicy.rules.length }} 条</span>
              </div>
            </div>
            
            <div class="rules-summary">
              <div class="summary-title">规则摘要</div>
              <div class="summary-list" *ngIf="currentPolicy.rules.length > 0">
                <div 
                  *ngFor="let rule of currentPolicy.rules; let i = index" 
                  class="summary-item"
                >
                  <span class="summary-number">{{ i + 1 }}.</span>
                  <span class="summary-content">{{ getRuleDescription(rule) }}</span>
                </div>
              </div>
              <div class="summary-empty" *ngIf="currentPolicy.rules.length === 0">
                暂无规则
              </div>
              <div class="fallback-note">
                <span class="note-icon">💡</span>
                <span>如果所有规则都不满足，默认使用 FCFS 策略</span>
              </div>
            </div>
          </div>

          <div class="card quick-test-card">
            <div class="card-title">
              <span>⚡ 快速测试</span>
              <button 
                class="btn btn-primary btn-sm"
                (click)="runQuickTest()"
                [disabled]="processes.length === 0 || currentPolicy.rules.length === 0"
              >
                运行测试
              </button>
            </div>
            
            <div class="process-count-info">
              当前进程数：{{ processes.length }} 个
              <span class="hint">(与主模拟器共享进程配置)</span>
            </div>

            <div class="mini-gantt-container" *ngIf="quickTestResult">
              <div class="mini-gantt-title">迷你甘特图</div>
              <div class="mini-gantt">
                <div class="gantt-process-row" *ngFor="let proc of processList">
                  <div class="gantt-label">
                    <span class="color-dot" [style.background]="proc.color"></span>
                    {{ proc.name }}
                  </div>
                  <div class="gantt-timeline">
                    <div 
                      *ngFor="let block of getBlocksForProcess(proc.pid)"
                      class="mini-gantt-block"
                      [class.running]="block.status === 'running'"
                      [class.ready]="block.status === 'ready'"
                      [class.waiting]="block.status === 'waiting'"
                      [class.not_arrived]="block.status === 'not_arrived'"
                      [class.completed]="block.status === 'completed'"
                      [style.left]="(block.startTime / quickTestResult.totalTime) * 100 + '%'"
                      [style.width]="((block.endTime - block.startTime) / quickTestResult.totalTime) * 100 + '%'"
                      [style.background]="block.status === 'running' ? proc.color : undefined"
                    ></div>
                  </div>
                </div>
              </div>
              <div class="gantt-time-axis">
                <span>0</span>
                <span>{{ quickTestResult.totalTime }} 时间单位</span>
              </div>
            </div>

            <div class="quick-stats" *ngIf="quickTestResult">
              <div class="stat-item">
                <span class="stat-label">平均等待时间</span>
                <span class="stat-value">{{ quickTestResult.stats.avgWaitingTime.toFixed(2) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平均周转时间</span>
                <span class="stat-value">{{ quickTestResult.stats.avgTurnaroundTime.toFixed(2) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">CPU利用率</span>
                <span class="stat-value">{{ quickTestResult.stats.cpuUtilization.toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <div class="card compare-card">
            <div class="card-title">
              <span>📊 与内置算法对比</span>
              <button 
                class="btn btn-primary btn-sm"
                (click)="runComparison()"
                [disabled]="processes.length === 0 || currentPolicy.rules.length === 0 || selectedAlgorithms.length === 0"
              >
                运行对比
              </button>
            </div>

            <div class="algo-selector">
              <div class="selector-label">选择对比算法（1-3个）：</div>
              <div class="algo-checkboxes">
                <label 
                  *ngFor="let algo of builtinAlgorithms" 
                  class="algo-check-label"
                >
                  <input 
                    type="checkbox" 
                    [checked]="selectedAlgorithms.includes(algo.type)"
                    (change)="toggleAlgorithm(algo.type)"
                  />
                  <span class="check-custom"></span>
                  <span class="algo-name">{{ algo.name }}</span>
                </label>
              </div>
            </div>

            <div class="compare-results" *ngIf="compareResults.length > 0">
              <table class="compare-table">
                <thead>
                  <tr>
                    <th>指标</th>
                    <th>自定义策略</th>
                    <th *ngFor="let r of compareResults">{{ r.algorithmName }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>平均等待时间</td>
                    <td 
                      [class.best]="isCustomBest('avgWaitingTime')"
                    >
                      {{ formatNumber(customCompareStats?.avgWaitingTime, 2) }}
                    </td>
                    <td 
                      *ngFor="let r of compareResults"
                      [class.best]="isBestMetric('avgWaitingTime', r.result.stats.avgWaitingTime)"
                    >
                      {{ r.result.stats.avgWaitingTime.toFixed(2) }}
                    </td>
                  </tr>
                  <tr>
                    <td>平均周转时间</td>
                    <td 
                      [class.best]="isCustomBest('avgTurnaroundTime')"
                    >
                      {{ formatNumber(customCompareStats?.avgTurnaroundTime, 2) }}
                    </td>
                    <td 
                      *ngFor="let r of compareResults"
                      [class.best]="isBestMetric('avgTurnaroundTime', r.result.stats.avgTurnaroundTime)"
                    >
                      {{ r.result.stats.avgTurnaroundTime.toFixed(2) }}
                    </td>
                  </tr>
                  <tr>
                    <td>CPU利用率</td>
                    <td 
                      [class.best]="isCustomBest('cpuUtilization', true)"
                    >
                      {{ formatNumber(customCompareStats?.cpuUtilization, 1) }}%
                    </td>
                    <td 
                      *ngFor="let r of compareResults"
                      [class.best]="isBestMetric('cpuUtilization', r.result.stats.cpuUtilization, true)"
                    >
                      {{ r.result.stats.cpuUtilization.toFixed(1) }}%
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="table-legend">
                <span class="best-indicator"></span>
                <span class="legend-text">最优值</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scheduler-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
    }

    .saved-policies-bar {
      background: white;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .bar-title {
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
    }

    .bar-title .icon {
      font-size: 16px;
    }

    .policy-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .policy-chip {
      padding: 6px 14px;
      background: #f1f5f9;
      border: 2px solid #e2e8f0;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
    }

    .policy-chip:hover {
      border-color: #94a3b8;
      background: #e2e8f0;
    }

    .policy-chip.active {
      background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
      border-color: #667eea;
      color: #4338ca;
      font-weight: 500;
    }

    .rule-count {
      color: #94a3b8;
      font-size: 11px;
      margin-left: 4px;
    }

    .policy-chip.active .rule-count {
      color: #a5b4fc;
    }

    .empty-hint {
      color: #94a3b8;
      font-size: 13px;
      font-style: italic;
    }

    .editor-layout {
      display: flex;
      gap: 16px;
      flex: 1;
      min-height: 0;
    }

    .left-panel {
      width: 480px;
      min-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }

    .right-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      min-width: 0;
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      font-weight: 600;
      color: #334155;
      font-size: 15px;
    }

    .hint-text {
      font-size: 11px;
      color: #94a3b8;
      font-weight: normal;
    }

    .rules-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 12px;
    }

    .rule-card {
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      background: #f8fafc;
      transition: all 0.2s;
      cursor: grab;
    }

    .rule-card:hover {
      border-color: #a5b4fc;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
    }

    .rule-card.dragging {
      opacity: 0.5;
      transform: scale(1.02);
    }

    .rule-card.drag-over {
      border-color: #667eea;
      border-style: dashed;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .rule-number {
      font-weight: 600;
      color: #4338ca;
      font-size: 13px;
      background: #eef2ff;
      padding: 4px 10px;
      border-radius: 12px;
    }

    .rule-actions {
      display: flex;
      gap: 4px;
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      border: 1px solid #cbd5e0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-icon:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-icon:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-delete:hover:not(:disabled) {
      background: #fee2e2;
      border-color: #f87171;
      color: #dc2626;
    }

    .btn-delete-small {
      width: 22px;
      height: 22px;
      font-size: 10px;
    }

    .rule-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .conditions-section {
      background: white;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .conditions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .condition-item {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .condition-type-select {
      flex: 1;
      min-width: 140px;
      padding: 6px 10px;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 12px;
      background: white;
    }

    .operator-select {
      width: 80px;
      padding: 6px 8px;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 12px;
      background: white;
    }

    .value-input {
      width: 70px;
      padding: 6px 8px;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 12px;
    }

    .add-condition-btn {
      margin-top: 8px;
      width: 100%;
    }

    .action-section {
      background: white;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .action-select {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 13px;
      background: white;
    }

    .rule-summary {
      margin-top: 10px;
      padding: 8px 10px;
      background: #fef3c7;
      border-radius: 6px;
      font-size: 12px;
      color: #92400e;
    }

    .summary-label {
      font-weight: 600;
    }

    .empty-rules {
      text-align: center;
      padding: 30px;
      color: #94a3b8;
    }

    .empty-icon {
      font-size: 36px;
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 13px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e0;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .btn-sm {
      padding: 5px 12px;
      font-size: 12px;
    }

    .add-rule-btn {
      width: 100%;
      padding: 10px;
    }

    .save-section .save-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
    }

    .name-input {
      padding: 8px 12px;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 14px;
    }

    .name-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .save-btn {
      width: 100%;
      padding: 10px;
    }

    .reset-btn {
      width: 100%;
    }

    .policy-info {
      display: flex;
      gap: 20px;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .policy-name .label,
    .rule-count-info .label {
      font-size: 12px;
      color: #64748b;
    }

    .policy-name .value {
      font-weight: 600;
      color: #334155;
      margin-left: 4px;
    }

    .rules-summary .summary-title {
      font-weight: 600;
      color: #475569;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .summary-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .summary-item {
      display: flex;
      gap: 8px;
      padding: 8px 10px;
      background: #f8fafc;
      border-radius: 6px;
      font-size: 12px;
      color: #475569;
    }

    .summary-number {
      font-weight: 600;
      color: #667eea;
      flex-shrink: 0;
    }

    .summary-empty {
      color: #94a3b8;
      font-size: 13px;
      font-style: italic;
      padding: 10px;
      text-align: center;
    }

    .fallback-note {
      margin-top: 12px;
      padding: 10px;
      background: #f0f9ff;
      border-radius: 6px;
      font-size: 12px;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .note-icon {
      font-size: 14px;
    }

    .process-count-info {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 12px;
    }

    .process-count-info .hint {
      color: #94a3b8;
      font-size: 11px;
    }

    .mini-gantt-container {
      margin-top: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .mini-gantt-title {
      font-weight: 600;
      color: #475569;
      margin-bottom: 10px;
      font-size: 13px;
    }

    .mini-gantt {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .gantt-process-row {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 20px;
    }

    .gantt-label {
      width: 50px;
      font-size: 11px;
      font-weight: 500;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .gantt-timeline {
      flex: 1;
      height: 16px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      position: relative;
      overflow: hidden;
    }

    .mini-gantt-block {
      position: absolute;
      top: 0;
      bottom: 0;
      border: 1px solid rgba(0,0,0,0.1);
    }

    .mini-gantt-block.ready {
      background: #fef3c7 !important;
    }

    .mini-gantt-block.waiting {
      background: #cbd5e1 !important;
    }

    .mini-gantt-block.not_arrived {
      background: #ffffff !important;
      border: 1px dashed #cbd5e1;
    }

    .mini-gantt-block.completed {
      background: #bbf7d0 !important;
    }

    .gantt-time-axis {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      padding-left: 58px;
      font-size: 10px;
      color: #94a3b8;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 12px;
    }

    .stat-item {
      text-align: center;
      padding: 10px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .stat-label {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
      color: #334155;
    }

    .algo-selector {
      margin-bottom: 14px;
    }

    .selector-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }

    .algo-checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .algo-check-label {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      position: relative;
      user-select: none;
    }

    .algo-check-label:hover {
      border-color: #a5b4fc;
      background: #eef2ff;
    }

    .algo-check-label input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .algo-check-label:has(input:checked) {
      border-color: #667eea;
      background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
    }

    .check-custom {
      width: 14px;
      height: 14px;
      border: 2px solid #cbd5e0;
      border-radius: 3px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .algo-check-label:has(input:checked) .check-custom {
      background: #667eea;
      border-color: #667eea;
    }

    .algo-check-label:has(input:checked) .check-custom::after {
      content: '✓';
      color: white;
      font-size: 10px;
      font-weight: 700;
    }

    .algo-name {
      color: #475569;
      font-weight: 500;
    }

    .algo-check-label:has(input:checked) .algo-name {
      color: #4338ca;
    }

    .compare-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .compare-table th,
    .compare-table td {
      padding: 10px 12px;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }

    .compare-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      font-size: 12px;
    }

    .compare-table td {
      color: #334155;
    }

    .compare-table td:first-child,
    .compare-table th:first-child {
      text-align: left;
      font-weight: 500;
    }

    .compare-table td.best {
      background: #d1fae5;
      color: #065f46;
      font-weight: 600;
    }

    .table-legend {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      font-size: 11px;
      color: #64748b;
      justify-content: flex-end;
    }

    .best-indicator {
      width: 16px;
      height: 16px;
      background: #d1fae5;
      border-radius: 3px;
    }

    @media (max-width: 1200px) {
      .editor-layout {
        flex-direction: column;
      }
      
      .left-panel {
        width: 100%;
        min-width: 0;
      }
    }
  `]
})
export class CustomSchedulerComponent implements OnInit {
  currentPolicy: CustomSchedulerPolicy;
  policyName = '';
  savedPolicies: CustomSchedulerPolicy[] = [];
  
  processes: Process[] = [];
  quickTestResult: SchedulerResult | null = null;
  
  selectedAlgorithms: string[] = ['fcfs', 'sjf'];
  compareResults: { algorithmName: string; result: SchedulerResult }[] = [];
  customCompareStats: SchedulerStats | null = null;
  
  private pressTimer: any = null;
  draggedRuleIndex: number | null = null;
  
  readonly COMPARISON_OPERATORS = COMPARISON_OPERATORS;
  readonly getRuleDescription = getRuleDescription;
  readonly getConditionDescription = getConditionDescription;
  readonly getActionDescription = getActionDescription;
  
  conditionTypes = [
    { value: 'ready_queue_length' as ConditionType, label: '就绪队列长度' },
    { value: 'current_run_time' as ConditionType, label: '当前进程已运行时间' },
    { value: 'higher_priority_exists' as ConditionType, label: '存在更高优先级进程' },
    { value: 'remaining_time' as ConditionType, label: '当前进程剩余时间' },
    { value: 'cpu_idle' as ConditionType, label: 'CPU空闲（无进程运行）' }
  ];
  
  actionTypes = [
    { value: 'preempt_to_tail' as ActionType, label: '抢占当前进程，移到队列尾部' },
    { value: 'select_highest_priority' as ActionType, label: '选择优先级最高的进程' },
    { value: 'select_shortest_remaining' as ActionType, label: '选择剩余时间最短的进程' },
    { value: 'select_longest_waiting' as ActionType, label: '选择等待时间最长的进程' },
    { value: 'continue_current' as ActionType, label: '继续运行当前进程' }
  ];
  
  builtinAlgorithms = [
    { type: 'fcfs', name: 'FCFS' },
    { type: 'sjf', name: 'SJF' },
    { type: 'srtf', name: 'SRTF' },
    { type: 'rr', name: 'RR' },
    { type: 'priority', name: 'Priority' }
  ];

  constructor(
    private customSchedulerService: CustomSchedulerService,
    private policyStorageService: PolicyStorageService,
    private processService: ProcessService,
    private schedulerService: SchedulerService
  ) {
    this.currentPolicy = this.createEmptyPolicy();
  }

  ngOnInit(): void {
    this.processes = this.processService.getProcesses();
    this.savedPolicies = this.policyStorageService.getAllPolicies();
  }
  
  get processList(): Process[] {
    if (!this.quickTestResult) return [];
    return Array.from(this.quickTestResult.processes.values()).sort((a, b) => a.pid - b.pid);
  }

  private createEmptyPolicy(): CustomSchedulerPolicy {
    return {
      id: '',
      name: '',
      description: '',
      rules: [],
      createdAt: 0,
      updatedAt: 0
    };
  }

  addRule(): void {
    const newRule: SchedulerRule = {
      id: generateRuleId(),
      conditions: [
        {
          type: 'ready_queue_length',
          operator: '>',
          value: 2
        }
      ],
      action: {
        type: 'select_highest_priority'
      }
    };
    this.currentPolicy.rules.push(newRule);
  }

  deleteRule(index: number): void {
    this.currentPolicy.rules.splice(index, 1);
  }

  moveRuleUp(index: number): void {
    if (index > 0) {
      const temp = this.currentPolicy.rules[index];
      this.currentPolicy.rules[index] = this.currentPolicy.rules[index - 1];
      this.currentPolicy.rules[index - 1] = temp;
    }
  }

  moveRuleDown(index: number): void {
    if (index < this.currentPolicy.rules.length - 1) {
      const temp = this.currentPolicy.rules[index];
      this.currentPolicy.rules[index] = this.currentPolicy.rules[index + 1];
      this.currentPolicy.rules[index + 1] = temp;
    }
  }

  addCondition(rule: SchedulerRule): void {
    rule.conditions.push({
      type: 'ready_queue_length',
      operator: '>',
      value: 1
    });
  }

  removeCondition(rule: SchedulerRule, index: number): void {
    if (rule.conditions.length > 1) {
      rule.conditions.splice(index, 1);
    }
  }

  onConditionTypeChange(rule: SchedulerRule, index: number): void {
    const cond = rule.conditions[index];
    if (!this.needsOperator(cond.type)) {
      cond.operator = undefined;
      cond.value = undefined;
    } else {
      if (!cond.operator) {
        cond.operator = '>';
        cond.value = 1;
      }
    }
  }

  needsOperator(type: ConditionType): boolean {
    return type === 'ready_queue_length' || 
           type === 'current_run_time' || 
           type === 'remaining_time';
  }

  onDragStart(event: DragEvent, index: number): void {
    this.draggedRuleIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragLeave(event: DragEvent): void {
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    if (this.draggedRuleIndex === null || this.draggedRuleIndex === dropIndex) return;
    
    const draggedRule = this.currentPolicy.rules[this.draggedRuleIndex];
    this.currentPolicy.rules.splice(this.draggedRuleIndex, 1);
    this.currentPolicy.rules.splice(dropIndex, 0, draggedRule);
    
    this.draggedRuleIndex = null;
  }

  onDragEnd(): void {
    this.draggedRuleIndex = null;
  }

  saveCurrentPolicy(): void {
    if (!this.policyName.trim()) {
      alert('请输入策略名称');
      return;
    }
    
    if (this.currentPolicy.rules.length === 0) {
      alert('请至少添加一条规则');
      return;
    }
    
    this.currentPolicy.name = this.policyName.trim();
    const saved = this.policyStorageService.savePolicy(this.currentPolicy);
    this.currentPolicy = { ...saved };
    this.savedPolicies = this.policyStorageService.getAllPolicies();
  }

  loadPolicy(policy: CustomSchedulerPolicy): void {
    this.currentPolicy = {
      ...policy,
      rules: policy.rules.map(r => ({ ...r, conditions: [...r.conditions] }))
    };
    this.policyName = policy.name;
    this.quickTestResult = null;
    this.compareResults = [];
  }

  resetEditor(): void {
    this.currentPolicy = this.createEmptyPolicy();
    this.policyName = '';
    this.quickTestResult = null;
    this.compareResults = [];
  }

  startPressTimer(policyId: string): void {
    this.pressTimer = setTimeout(() => {
      if (confirm('确定要删除这个策略吗？')) {
        this.policyStorageService.deletePolicy(policyId);
        this.savedPolicies = this.policyStorageService.getAllPolicies();
        if (this.currentPolicy.id === policyId) {
          this.resetEditor();
        }
      }
    }, 800);
  }

  clearPressTimer(): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  runQuickTest(): void {
    if (this.processes.length === 0 || this.currentPolicy.rules.length === 0) return;
    
    this.quickTestResult = this.customSchedulerService.runSimulation(
      this.processes,
      this.currentPolicy,
      1
    );
  }

  getBlocksForProcess(pid: number): any[] {
    if (!this.quickTestResult) return [];
    return this.quickTestResult.ganttBlocks.get(pid) || [];
  }

  toggleAlgorithm(algoType: string): void {
    const idx = this.selectedAlgorithms.indexOf(algoType);
    if (idx > -1) {
      if (this.selectedAlgorithms.length > 1) {
        this.selectedAlgorithms.splice(idx, 1);
      }
    } else {
      if (this.selectedAlgorithms.length < 3) {
        this.selectedAlgorithms.push(algoType);
      }
    }
  }

  runComparison(): void {
    if (this.processes.length === 0) return;
    if (this.currentPolicy.rules.length === 0) return;
    if (this.selectedAlgorithms.length === 0) return;
    
    const customResult = this.customSchedulerService.runSimulation(
      this.processes,
      this.currentPolicy,
      1
    );
    this.customCompareStats = customResult.stats;
    
    this.compareResults = [];
    for (const algoType of this.selectedAlgorithms) {
      const config: AlgorithmConfig = {
        type: algoType as any,
        name: this.builtinAlgorithms.find(a => a.type === algoType)?.name || algoType,
        timeQuantum: 4,
        preemptive: true,
        contextSwitchOverhead: 1
      };
      
      const result = this.schedulerService.runSimulation(this.processes, config);
      this.compareResults.push({
        algorithmName: config.name,
        result
      });
    }
  }

  formatNumber(value: number | undefined, decimals: number): string {
    if (value === undefined || value === null) return '-';
    return value.toFixed(decimals);
  }

  isCustomBest(metric: string, higherIsBetter = false): boolean {
    if (!this.customCompareStats) return false;
    const value = (this.customCompareStats as any)[metric];
    return this.isBestMetric(metric, value, higherIsBetter);
  }

  isBestMetric(metric: string, value: number | undefined, higherIsBetter = false): boolean {
    if (value === undefined) return false;
    
    const allValues: number[] = [];
    
    if (this.customCompareStats) {
      allValues.push((this.customCompareStats as any)[metric]);
    }
    
    for (const r of this.compareResults) {
      allValues.push((r.result.stats as any)[metric]);
    }
    
    if (allValues.length === 0) return false;
    
    const best = higherIsBetter ? Math.max(...allValues) : Math.min(...allValues);
    return value === best;
  }
}
