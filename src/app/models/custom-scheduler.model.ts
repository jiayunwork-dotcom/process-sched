export type ConditionType = 
  | 'ready_queue_length'
  | 'current_run_time'
  | 'higher_priority_exists'
  | 'remaining_time'
  | 'cpu_idle';

export type ComparisonOperator = '>' | '<' | '=' | '>=' | '<=';

export interface SchedulerCondition {
  type: ConditionType;
  operator?: ComparisonOperator;
  value?: number;
}

export type ActionType = 
  | 'preempt_to_tail'
  | 'select_highest_priority'
  | 'select_shortest_remaining'
  | 'select_longest_waiting'
  | 'continue_current';

export interface SchedulerAction {
  type: ActionType;
}

export interface SchedulerRule {
  id: string;
  conditions: SchedulerCondition[];
  action: SchedulerAction;
  enabled?: boolean;
}

export interface CustomSchedulerPolicy {
  id: string;
  name: string;
  description?: string;
  rules: SchedulerRule[];
  createdAt: number;
  updatedAt: number;
}

export const CONDITION_LABELS: Record<ConditionType, string> = {
  'ready_queue_length': '就绪队列长度',
  'current_run_time': '当前进程已运行时间',
  'higher_priority_exists': '存在更高优先级进程',
  'remaining_time': '当前进程剩余时间',
  'cpu_idle': 'CPU空闲（无进程运行）'
};

export const ACTION_LABELS: Record<ActionType, string> = {
  'preempt_to_tail': '抢占当前进程，移到队列尾部',
  'select_highest_priority': '选择优先级最高的进程',
  'select_shortest_remaining': '选择剩余时间最短的进程',
  'select_longest_waiting': '选择等待时间最长的进程',
  'continue_current': '继续运行当前进程'
};

export const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: '>', label: '大于 (>)' },
  { value: '<', label: '小于 (<)' },
  { value: '=', label: '等于 (=)' },
  { value: '>=', label: '大于等于 (>=)' },
  { value: '<=', label: '小于等于 (<=)' }
];

export function generateRuleId(): string {
  return 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function generatePolicyId(): string {
  return 'policy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function getConditionDescription(condition: SchedulerCondition): string {
  const label = CONDITION_LABELS[condition.type];
  
  switch (condition.type) {
    case 'ready_queue_length':
    case 'current_run_time':
    case 'remaining_time':
      return `${label} ${condition.operator} ${condition.value}`;
    case 'higher_priority_exists':
      return label;
    case 'cpu_idle':
      return label;
    default:
      return label;
  }
}

export function getActionDescription(action: SchedulerAction): string {
  return ACTION_LABELS[action.type] || action.type;
}

export function getRuleDescription(rule: SchedulerRule): string {
  const conditions = rule.conditions.map(c => getConditionDescription(c)).join(' 且 ');
  const action = getActionDescription(rule.action);
  return `当 ${conditions} 时，${action}`;
}
