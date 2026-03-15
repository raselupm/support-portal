import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import NewTicketForm from './new-ticket-form'

export default async function NewTicketPage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (await isStaff(session.email)) redirect('/tickets')

  return <NewTicketForm />
}
