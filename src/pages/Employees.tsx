import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { ErrorNote, LoadingBlock, PageHeader } from '@/components/common'
import { EmployeeForm } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProfiles, useTasks } from '@/lib/queries'

// Accounts are created by the create-user Edge Function: only a manager can call it,
// and the service key stays on the server.
export function Employees() {
  const [open, setOpen] = useState(false)
  const { data, error, isPending } = useProfiles()
  const { data: tasks } = useTasks()
  const active = (id: string) => tasks?.filter((t) => t.assignee_id === id && t.status !== 'accepted').length ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Доступ к системе"
        title="Сотрудники"
        sub="Самостоятельная регистрация закрыта: учётные записи создаёт постановщик."
        actions={
          <Button size="lg" onClick={() => setOpen(true)}>
            <UserPlus /> Добавить
          </Button>
        }
      />
      <ErrorNote error={error} />
      {isPending && <LoadingBlock />}
      {data && (
        <div className="bg-card overflow-x-auto rounded-lg border">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="eyebrow">Имя</TableHead>
                <TableHead className="eyebrow">Роль</TableHead>
                <TableHead className="eyebrow text-right">Активных задач</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="py-3 font-semibold">{p.full_name}</TableCell>
                  <TableCell>{p.role === 'manager' ? 'Постановщик' : 'Исполнитель'}</TableCell>
                  <TableCell className="text-right font-mono">{p.role === 'executor' ? active(p.id) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый сотрудник</DialogTitle>
            <DialogDescription>Передайте сотруднику email и временный пароль.</DialogDescription>
          </DialogHeader>
          <EmployeeForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
