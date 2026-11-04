import { z } from 'zod'

// Client-side validation mirrors the database constraints so the user sees errors before the request.
const required = (label: string) => z.string().trim().min(1, `Укажите ${label}`)

export const objectSchema = z.object({
  name: required('название').max(200),
  address: required('адрес').max(300),
})
export type ObjectValues = z.infer<typeof objectSchema>

export const taskSchema = z.object({
  title: required('название').max(200),
  description: z.string().max(5000),
  object_id: z.string().min(1, 'Выберите объект'),
  assignee_id: z.string().min(1, 'Выберите исполнителя'),
})
export type TaskValues = z.infer<typeof taskSchema>

export const reworkSchema = z.object({
  comment: z.string().trim().min(1, 'Опишите, что нужно исправить').max(2000),
})
export type ReworkValues = z.infer<typeof reworkSchema>

export const employeeSchema = z.object({
  full_name: z.string().trim().min(2, 'Укажите имя').max(100),
  email: z.email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  role: z.enum(['manager', 'executor']),
})
export type EmployeeValues = z.infer<typeof employeeSchema>

export const passwordSchema = z
  .object({ password: z.string().min(8, 'Минимум 8 символов'), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Пароли не совпадают' })
export type PasswordValues = z.infer<typeof passwordSchema>
