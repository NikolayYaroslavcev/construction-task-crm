import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { Controller, useForm, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateEmployee, useObjects, useProfiles, useSaveObject, useSaveTask } from '@/lib/queries'
import {
  employeeSchema,
  objectSchema,
  passwordSchema,
  reworkSchema,
  taskSchema,
  type EmployeeValues,
  type ObjectValues,
  type PasswordValues,
  type ReworkValues,
  type TaskValues,
} from '@/lib/schemas'
import { errorText, supabase, type SiteObject, type Task } from '@/lib/supabase'

function Submit({ pending, children }: { pending: boolean; children: string }) {
  return (
    <DialogFooter className="mt-2">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Сохраняем…' : children}
      </Button>
    </DialogFooter>
  )
}

function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} className="w-full" aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function ObjectForm({ object, onDone }: { object?: SiteObject; onDone: () => void }) {
  const save = useSaveObject(object?.id)
  const { register, handleSubmit, formState } = useForm<ObjectValues>({
    resolver: zodResolver(objectSchema),
    defaultValues: { name: object?.name ?? '', address: object?.address ?? '' },
  })
  const { errors } = formState
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: onDone }))} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Название</FieldLabel>
          <Input id="name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">Адрес</FieldLabel>
          <Input id="address" aria-invalid={!!errors.address} {...register('address')} />
          <FieldError errors={[errors.address]} />
        </Field>
        <Submit pending={save.isPending}>{object ? 'Сохранить' : 'Создать объект'}</Submit>
      </FieldGroup>
    </form>
  )
}

export function TaskForm({ task, objectId, onDone }: { task?: Task; objectId?: string; onDone: () => void }) {
  const save = useSaveTask(task?.id)
  const { data: objects } = useObjects()
  const { data: profiles } = useProfiles()
  const { register, control, handleSubmit, formState } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      object_id: task?.object_id ?? objectId ?? '',
      assignee_id: task?.assignee_id ?? '',
    },
  })
  const { errors } = formState
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: onDone }))} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Название</FieldLabel>
          <Input id="title" autoFocus aria-invalid={!!errors.title} {...register('title')} />
          <FieldError errors={[errors.title]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Описание</FieldLabel>
          <Textarea id="description" rows={4} {...register('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={control}
            name="object_id"
            label="Объект"
            placeholder="Выберите объект"
            options={(objects ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
          <SelectField
            control={control}
            name="assignee_id"
            label="Исполнитель"
            placeholder="Выберите исполнителя"
            options={(profiles?.list ?? []).filter((p) => p.role === 'executor').map((p) => ({ value: p.id, label: p.full_name }))}
          />
        </div>
        <Submit pending={save.isPending}>{task ? 'Сохранить' : 'Создать задачу'}</Submit>
      </FieldGroup>
    </form>
  )
}

export function ReworkForm({ pending, onSubmit }: { pending: boolean; onSubmit: (comment: string) => void }) {
  const { register, handleSubmit, formState } = useForm<ReworkValues>({
    resolver: zodResolver(reworkSchema),
    defaultValues: { comment: '' },
  })
  const { errors } = formState
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v.comment))} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.comment}>
          <FieldLabel htmlFor="comment">Что нужно исправить</FieldLabel>
          <Textarea id="comment" rows={4} autoFocus aria-invalid={!!errors.comment} {...register('comment')} />
          <FieldError errors={[errors.comment]} />
        </Field>
        <Submit pending={pending}>Вернуть на доработку</Submit>
      </FieldGroup>
    </form>
  )
}

export function EmployeeForm({ onDone }: { onDone: () => void }) {
  const create = useCreateEmployee()
  const { register, control, handleSubmit, formState } = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { full_name: '', email: '', password: '', role: 'executor' },
  })
  const { errors } = formState
  return (
    <form onSubmit={handleSubmit((v) => create.mutate(v, { onSuccess: onDone }))} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.full_name}>
          <FieldLabel htmlFor="full_name">Имя и фамилия</FieldLabel>
          <Input id="full_name" autoFocus aria-invalid={!!errors.full_name} {...register('full_name')} />
          <FieldError errors={[errors.full_name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email (логин)</FieldLabel>
          <Input id="email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Временный пароль</FieldLabel>
          <Input id="password" type="text" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
          <FieldError errors={[errors.password]} />
        </Field>
        <SelectField
          control={control}
          name="role"
          label="Роль"
          placeholder="Выберите роль"
          options={[
            { value: 'executor', label: 'Исполнитель' },
            { value: 'manager', label: 'Постановщик' },
          ]}
        />
        <Submit pending={create.isPending}>Добавить сотрудника</Submit>
      </FieldGroup>
    </form>
  )
}

export function PasswordForm({ onDone }: { onDone: () => void }) {
  const [pending, setPending] = useState(false)
  const { register, handleSubmit, formState } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const { errors } = formState
  const submit = async ({ password }: PasswordValues) => {
    setPending(true)
    const { error } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (error) return toast.error(errorText(error))
    toast.success('Пароль изменён')
    onDone()
  }
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="new-password">Новый пароль</FieldLabel>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="confirm-password">Повторите пароль</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register('confirm')}
          />
          <FieldError errors={[errors.confirm]} />
        </Field>
        <Submit pending={pending}>Сменить пароль</Submit>
      </FieldGroup>
    </form>
  )
}
