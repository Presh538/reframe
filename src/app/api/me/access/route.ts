import { NextResponse } from 'next/server'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getAccountAccess } from '@/lib/billing/entitlements'
import { getCreditBalance } from '@/lib/billing/balance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }
  const user = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      plan: 'guest',
      features: {},
      credits: null,
    }, { headers: noStore })
  }

  const [access, credits] = await Promise.all([getAccountAccess(user.id), getCreditBalance(user.id)])

  return NextResponse.json({
    authenticated: true,
    plan: access?.planKey ?? 'free',
    features: access?.features ?? {},
    credits: {
      available: credits?.available ?? 0,
      reserved: credits?.reserved ?? 0,
    },
  }, { headers: noStore })
}
