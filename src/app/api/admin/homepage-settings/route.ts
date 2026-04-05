/**
 * API: Admin Homepage Settings
 *
 * GET  /api/admin/homepage-settings          – Get all homepage settings grouped
 * GET  /api/admin/homepage-settings?group=X  – Get settings for a specific group
 * PUT  /api/admin/homepage-settings          – Update settings (bulk or single)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { getAllPublicSettings, setSetting, DEFAULTS, getAllSettingGroups } from '@/lib/site-settings'

async function checkAdmin() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  })

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null
  return true
}

// GET – retrieve settings
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')

    if (group) {
      // Return raw settings for a specific group (for admin editing)
      const rows = await prisma.setting.findMany({
        where: { group },
        orderBy: { key: 'asc' },
      })

      // Merge with defaults
      const existingKeys = new Set(rows.map((r) => r.key))
      const groupDefaults = Object.entries(DEFAULTS)
        .filter(([, def]) => def.group === group)
        .map(([key, def]) => ({
          key,
          value: def.value,
          type: def.type,
          group: def.group,
          isDefault: !existingKeys.has(key),
        }))

      const merged: any[] = rows.map((r) => ({
        ...r,
        isDefault: false,
      }))

      // Add defaults that don't have DB rows
      const allKeys = new Set(merged.map((r: any) => r.key))
      for (const def of groupDefaults) {
        if (!allKeys.has(def.key)) {
          merged.push(def)
        }
      }

      merged.sort((a, b) => a.key.localeCompare(b.key))

      return NextResponse.json({ success: true, settings: merged, group })
    }

    // Return all groups overview
    const groups = getAllSettingGroups()
    const dbSettings = await prisma.setting.findMany({
      select: { key: true, value: true },
    })

    const dbMap = new Map(dbSettings.map((s) => [s.key, s.value]))

    // For each group, merge defaults with DB values
    const allSettings = {}
    for (const [groupName, keys] of Object.entries(groups)) {
      allSettings[groupName] = {}
      for (const { key, type, defaultValue } of keys) {
        const raw = dbMap.get(key) ?? defaultValue
        try {
          if (type === 'JSON') {
            allSettings[groupName][key] = JSON.parse(raw)
          } else if (type === 'BOOLEAN') {
            allSettings[groupName][key] = raw === 'true'
          } else if (type === 'NUMBER') {
            allSettings[groupName][key] = Number(raw)
          } else {
            allSettings[groupName][key] = raw
          }
        } catch {
          allSettings[groupName][key] = raw
        }
      }
    }

    return NextResponse.json({ success: true, settings: allSettings, groups: Object.keys(groups) })
  } catch (error) {
    console.error('Error fetching admin homepage settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 },
    )
  }
}

// PUT – update settings
export async function PUT(request: NextRequest) {
  try {
    const admin = await checkAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { key, value, settings } = body

    // Single key update
    if (key !== undefined && value !== undefined) {
      const def = DEFAULTS[key as keyof typeof DEFAULTS]
      if (!def) return NextResponse.json({ error: `Unknown setting: ${key}` }, { status: 400 })

      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          type: def.type,
          group: def.group,
        },
      })

      return NextResponse.json({ success: true, message: `Updated ${key}` })
    }

    // Bulk update (object of key-value pairs)
    if (settings && typeof settings === 'object') {
      const ops = Object.entries(settings).map(([k, v]) => {
        const def = DEFAULTS[k as keyof typeof DEFAULTS]
        if (!def) return null

        const strValue = typeof v === 'object' ? JSON.stringify(v) : String(v)

        return prisma.setting.upsert({
          where: { key: k },
          update: { value: strValue },
          create: {
            key: k,
            value: strValue,
            type: def.type,
            group: def.group,
          },
        })
      }).filter(Boolean)

      if (ops.length > 0) {
        await prisma.$transaction(ops as any[])
      }

      return NextResponse.json({ success: true, message: `Updated ${ops.length} settings` })
    }

    return NextResponse.json({ error: 'Provide "key"+"value" or "settings" object' }, { status: 400 })
  } catch (error) {
    console.error('Error updating homepage settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 },
    )
  }
}
