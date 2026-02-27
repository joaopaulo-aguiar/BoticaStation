/**
 * Visual Query Builder — RD Station / HubSpot-style segment rule editor.
 *
 * Supports:
 * - AND / OR groups
 * - Nested sub-groups
 * - Condition rows with field → operator → value
 * - All contact field types
 */
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus,
  Trash2,
  FolderPlus,
  GripVertical,
} from 'lucide-react'
import { Button, Input } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import {
  CONTACT_FIELDS,
  OPERATORS_BY_TYPE,
  NO_VALUE_OPERATORS,
  type SegmentRuleGroup,
  type SegmentCondition,
  type ConditionOperator,
  type FieldDefinition,
} from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createCondition(): SegmentCondition {
  return {
    id: uuidv4(),
    field: CONTACT_FIELDS[0].key,
    operator: 'equals',
    value: '',
  }
}

function createGroup(op: 'AND' | 'OR' = 'AND'): SegmentRuleGroup {
  return {
    id: uuidv4(),
    operator: op,
    conditions: [createCondition()],
    groups: [],
  }
}

function getFieldDef(key: string): FieldDefinition | undefined {
  return CONTACT_FIELDS.find((f) => f.key === key)
}

// Group fields by category
const FIELD_GROUPS = CONTACT_FIELDS.reduce<Record<string, FieldDefinition[]>>((acc, f) => {
  if (!acc[f.group]) acc[f.group] = []
  acc[f.group].push(f)
  return acc
}, {})

// ─── Component ───────────────────────────────────────────────────────────────

interface QueryBuilderProps {
  value: SegmentRuleGroup
  onChange: (value: SegmentRuleGroup) => void
}

export function QueryBuilder({ value, onChange }: QueryBuilderProps) {
  return (
    <div className="space-y-2">
      <RuleGroupEditor
        group={value}
        onChange={onChange}
        depth={0}
        isRoot
      />
    </div>
  )
}

// ─── Rule Group ──────────────────────────────────────────────────────────────

function RuleGroupEditor({
  group,
  onChange,
  onRemove,
  depth,
  isRoot,
}: {
  group: SegmentRuleGroup
  onChange: (group: SegmentRuleGroup) => void
  onRemove?: () => void
  depth: number
  isRoot?: boolean
}) {
  const borderColors = ['border-blue-300', 'border-violet-300', 'border-amber-300', 'border-emerald-300']
  const bgColors = ['bg-blue-50/40', 'bg-violet-50/40', 'bg-amber-50/40', 'bg-emerald-50/40']
  const colorIndex = depth % borderColors.length

  const toggleOperator = () => {
    onChange({ ...group, operator: group.operator === 'AND' ? 'OR' : 'AND' })
  }

  const addCondition = () => {
    onChange({ ...group, conditions: [...group.conditions, createCondition()] })
  }

  const addSubGroup = () => {
    onChange({
      ...group,
      groups: [...group.groups, createGroup(group.operator === 'AND' ? 'OR' : 'AND')],
    })
  }

  const updateCondition = (idx: number, cond: SegmentCondition) => {
    const next = [...group.conditions]
    next[idx] = cond
    onChange({ ...group, conditions: next })
  }

  const removeCondition = (idx: number) => {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) })
  }

  const updateSubGroup = (idx: number, sub: SegmentRuleGroup) => {
    const next = [...group.groups]
    next[idx] = sub
    onChange({ ...group, groups: next })
  }

  const removeSubGroup = (idx: number) => {
    onChange({ ...group, groups: group.groups.filter((_, i) => i !== idx) })
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3 space-y-2',
        borderColors[colorIndex],
        bgColors[colorIndex],
      )}
    >
      {/* Group header */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleOperator}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer',
            group.operator === 'AND'
              ? 'bg-blue-600 text-white'
              : 'bg-amber-500 text-white',
          )}
        >
          {group.operator === 'AND' ? 'E (AND)' : 'OU (OR)'}
        </button>
        <span className="text-xs text-slate-500">
          {group.operator === 'AND' ? 'Todas as condições devem ser verdadeiras' : 'Pelo menos uma condição deve ser verdadeira'}
        </span>
        {!isRoot && onRemove && (
          <button
            onClick={onRemove}
            className="ml-auto p-1 text-slate-400 hover:text-red-500 cursor-pointer"
            title="Remover grupo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Conditions */}
      {group.conditions.map((cond, idx) => (
        <ConditionRow
          key={cond.id}
          condition={cond}
          onChange={(c) => updateCondition(idx, c)}
          onRemove={group.conditions.length > 1 || group.groups.length > 0 ? () => removeCondition(idx) : undefined}
          showOperatorLabel={idx > 0}
          groupOperator={group.operator}
        />
      ))}

      {/* Sub-groups */}
      {group.groups.map((sub, idx) => (
        <div key={sub.id}>
          {(group.conditions.length > 0 || idx > 0) && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-slate-300" />
              <span className="text-[10px] font-bold uppercase text-slate-400">
                {group.operator}
              </span>
              <div className="flex-1 h-px bg-slate-300" />
            </div>
          )}
          <RuleGroupEditor
            group={sub}
            onChange={(g) => updateSubGroup(idx, g)}
            onRemove={() => removeSubGroup(idx)}
            depth={depth + 1}
          />
        </div>
      ))}

      {/* Add buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={addCondition} className="text-xs h-7">
          <Plus className="h-3 w-3" />
          Condição
        </Button>
        <Button variant="outline" size="sm" onClick={addSubGroup} className="text-xs h-7">
          <FolderPlus className="h-3 w-3" />
          Sub-grupo
        </Button>
      </div>
    </div>
  )
}

// ─── Condition Row ───────────────────────────────────────────────────────────

function ConditionRow({
  condition,
  onChange,
  onRemove,
  showOperatorLabel,
  groupOperator,
}: {
  condition: SegmentCondition
  onChange: (condition: SegmentCondition) => void
  onRemove?: () => void
  showOperatorLabel: boolean
  groupOperator: 'AND' | 'OR'
}) {
  const fieldDef = getFieldDef(condition.field)
  const fieldType = fieldDef?.type ?? 'string'
  const operators = OPERATORS_BY_TYPE[fieldType] ?? OPERATORS_BY_TYPE.string
  const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator)
  const needsValue2 = condition.operator === 'between'

  const handleFieldChange = (newField: string) => {
    const newDef = getFieldDef(newField)
    const newType = newDef?.type ?? 'string'
    const newOperators = OPERATORS_BY_TYPE[newType]
    const defaultOp = newOperators[0]?.value ?? 'equals'
    onChange({ ...condition, field: newField, operator: defaultOp, value: '', value2: undefined })
  }

  return (
    <div className="space-y-0.5">
      {showOperatorLabel && (
        <div className="flex items-center gap-2 py-0.5">
          <span className={cn(
            'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
            groupOperator === 'AND' ? 'text-blue-600 bg-blue-100' : 'text-amber-600 bg-amber-100',
          )}>
            {groupOperator}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 bg-white rounded-md border border-slate-200 p-2">
        <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0" />

        {/* Field selector */}
        <select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 min-w-[180px] focus:ring-1 focus:ring-botica-500 focus:outline-none"
        >
          {Object.entries(FIELD_GROUPS).map(([group, fields]) => (
            <optgroup key={group} label={group}>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Operator selector */}
        <select
          value={condition.operator}
          onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator, value: '', value2: undefined })}
          className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 min-w-[140px] focus:ring-1 focus:ring-botica-500 focus:outline-none"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {/* Value input */}
        {needsValue && (
          <ValueInput
            fieldDef={fieldDef}
            condition={condition}
            onChange={onChange}
          />
        )}

        {/* Second value (for 'between') */}
        {needsValue2 && (
          <>
            <span className="text-xs text-slate-400">e</span>
            <Input
              type="number"
              value={condition.value2 ?? ''}
              onChange={(e) => onChange({ ...condition, value2: e.target.value ? Number(e.target.value) : undefined })}
              className="h-7 w-24 text-xs"
              placeholder="Máx"
            />
          </>
        )}

        {/* Remove */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Value Input (type-aware) ────────────────────────────────────────────────

function ValueInput({
  fieldDef,
  condition,
  onChange,
}: {
  fieldDef: FieldDefinition | undefined
  condition: SegmentCondition
  onChange: (c: SegmentCondition) => void
}) {
  const fieldType = fieldDef?.type ?? 'string'

  if (fieldType === 'select' && fieldDef?.options) {
    if (condition.operator === 'in' || condition.operator === 'not_in') {
      // Multi-select
      const selected = Array.isArray(condition.value) ? condition.value : []
      return (
        <div className="flex flex-wrap gap-1">
          {fieldDef.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const next = selected.includes(opt.value)
                  ? selected.filter((v) => v !== opt.value)
                  : [...selected, opt.value]
                onChange({ ...condition, value: next })
              }}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer transition-colors',
                selected.includes(opt.value)
                  ? 'bg-botica-100 border-botica-300 text-botica-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )
    }

    return (
      <select
        value={String(condition.value)}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 min-w-[120px] focus:ring-1 focus:ring-botica-500 focus:outline-none"
      >
        <option value="">Selecione...</option>
        {fieldDef.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  if (fieldType === 'number' || condition.operator === 'in_last_days' || condition.operator === 'not_in_last_days') {
    return (
      <Input
        type="number"
        value={String(condition.value ?? '')}
        onChange={(e) => onChange({ ...condition, value: e.target.value ? Number(e.target.value) : '' })}
        className="h-7 w-28 text-xs"
        placeholder={condition.operator === 'in_last_days' || condition.operator === 'not_in_last_days' ? 'Dias' : 'Valor'}
      />
    )
  }

  if (fieldType === 'date' && condition.operator !== 'in_last_days' && condition.operator !== 'not_in_last_days') {
    return (
      <Input
        type="date"
        value={String(condition.value ?? '')}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        className="h-7 w-36 text-xs"
      />
    )
  }

  if (fieldType === 'array') {
    return (
      <Input
        type="text"
        value={String(condition.value ?? '')}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        className="h-7 flex-1 min-w-[120px] text-xs"
        placeholder="Valor da tag"
      />
    )
  }

  // Default: text input
  return (
    <Input
      type="text"
      value={String(condition.value ?? '')}
      onChange={(e) => onChange({ ...condition, value: e.target.value })}
      className="h-7 flex-1 min-w-[120px] text-xs"
      placeholder="Valor"
    />
  )
}

/** Export helper to create an empty rule group for new segments */
export function createEmptyRuleGroup(): SegmentRuleGroup {
  return createGroup('AND')
}
