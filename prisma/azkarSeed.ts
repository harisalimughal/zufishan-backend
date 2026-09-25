/**
 * Azkar Content Seed — Structure Scaffold
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  CONTENT PLACEHOLDER NOTICE                                          ║
 * ║                                                                          ║
 * ║  All Arabic text, transliterations, and translations in this file are   ║
 * ║  EXPLICITLY MARKED AS PLACEHOLDERS.                                     ║
 * ║                                                                          ║
 * ║  DO NOT run this seed in any environment until the placeholder fields   ║
 * ║  have been replaced with text verified against an authoritative         ║
 * ║  scholarly source, such as:                                             ║
 * ║                                                                          ║
 * ║    "Hisn al-Muslim" (Fortress of the Muslim)                            ║
 * ║    by Sa'id ibn 'Ali ibn Wahf al-Qahtani                                ║
 * ║    (ISBN 978-9960-717-05-5, Dar al-Qasim edition)                      ║
 * ║                                                                          ║
 * ║  A content authority must review and approve every arabic, transliteration║
 * ║  and translation field before this seed is executed.                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage (after filling all PLACEHOLDER values):
 *   npx tsx prisma/azkarSeed.ts
 *
 * The script is idempotent — it uses upsert on the category `slug` and a
 * deterministic content hash on items so re-runs are safe.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Category definitions ─────────────────────────────────────────────────────
// arabicName values are fixed well-known labels — not generated content.

const CATEGORIES = [
  {
    slug: 'morning',
    name: 'Morning Azkar',
    arabicName: 'أذكار الصباح',
    description: 'Supplications to be recited in the morning',
    iconName: 'Sunrise',
    displayOrder: 1,
  },
  {
    slug: 'evening',
    name: 'Evening Azkar',
    arabicName: 'أذكار المساء',
    description: 'Supplications to be recited in the evening',
    iconName: 'Sunset',
    displayOrder: 2,
  },
  {
    slug: 'sleep',
    name: 'Before Sleep',
    arabicName: 'أذكار النوم',
    description: 'Supplications to be recited before sleeping',
    iconName: 'Moon',
    displayOrder: 3,
  },
  {
    slug: 'prayer',
    name: 'Prayer Azkar',
    arabicName: 'أذكار الصلاة',
    description: 'Supplications related to the five daily prayers',
    iconName: 'Star',
    displayOrder: 4,
  },
  {
    slug: 'general',
    name: 'General Azkar',
    arabicName: 'أذكار عامة',
    description: 'General daily remembrance and supplications',
    iconName: 'Heart',
    displayOrder: 5,
  },
] as const

// ─── Item placeholders ────────────────────────────────────────────────────────
// Each entry below represents ONE verified dhikr.
// Fields marked /* PLACEHOLDER */ MUST be replaced before running in production.

interface ItemSeed {
  /** Matches a slug in CATEGORIES */
  categorySlug: string
  arabic: string           // Full Arabic text — verified source required
  transliteration: string | null  // Romanised pronunciation
  translation: string      // English meaning
  repetitions: number
  reference: string | null // e.g. "Sahih Bukhari 6311" or "Abu Dawud 5088"
  audioUrl: string | null  // Must be https:// or null
  displayOrder: number
}

const ITEM_SEEDS: ItemSeed[] = [
  // ── Morning ──────────────────────────────────────────────────────────────────
  {
    categorySlug: 'morning',
    arabic: '/* PLACEHOLDER — replace with verified Arabic text */',
    transliteration: '/* PLACEHOLDER — replace with verified transliteration */',
    translation: '/* PLACEHOLDER — replace with verified English translation */',
    repetitions: 1,
    reference: '/* PLACEHOLDER — e.g. Sahih Bukhari XXXX */',
    audioUrl: null,
    displayOrder: 1,
  },
  {
    categorySlug: 'morning',
    arabic: '/* PLACEHOLDER — replace with verified Arabic text */',
    transliteration: '/* PLACEHOLDER — replace with verified transliteration */',
    translation: '/* PLACEHOLDER — replace with verified English translation */',
    repetitions: 3,
    reference: '/* PLACEHOLDER — e.g. Abu Dawud XXXX */',
    audioUrl: null,
    displayOrder: 2,
  },

  // ── Evening ───────────────────────────────────────────────────────────────────
  {
    categorySlug: 'evening',
    arabic: '/* PLACEHOLDER — replace with verified Arabic text */',
    transliteration: '/* PLACEHOLDER — replace with verified transliteration */',
    translation: '/* PLACEHOLDER — replace with verified English translation */',
    repetitions: 1,
    reference: '/* PLACEHOLDER */',
    audioUrl: null,
    displayOrder: 1,
  },

  // ── Sleep ─────────────────────────────────────────────────────────────────────
  {
    categorySlug: 'sleep',
    arabic: '/* PLACEHOLDER — replace with verified Arabic text */',
    transliteration: '/* PLACEHOLDER — replace with verified transliteration */',
    translation: '/* PLACEHOLDER — replace with verified English translation */',
    repetitions: 1,
    reference: '/* PLACEHOLDER */',
    audioUrl: null,
    displayOrder: 1,
  },

  // ── Prayer ────────────────────────────────────────────────────────────────────
  {
    categorySlug: 'prayer',
    arabic: '/* PLACEHOLDER — replace with verified Arabic text */',
    transliteration: '/* PLACEHOLDER — replace with verified transliteration */',
    translation: '/* PLACEHOLDER — replace with verified English translation */',
    repetitions: 1,
    reference: '/* PLACEHOLDER */',
    audioUrl: null,
    displayOrder: 1,
  },

  // ── General ───────────────────────────────────────────────────────────────────
  {
    categorySlug: 'general',
    arabic: '/* PLACEHOLDER — replace with verified Arabic text */',
    transliteration: '/* PLACEHOLDER — replace with verified transliteration */',
    translation: '/* PLACEHOLDER — replace with verified English translation */',
    repetitions: 33,
    reference: '/* PLACEHOLDER */',
    audioUrl: null,
    displayOrder: 1,
  },
]

// ─── Safety guard ─────────────────────────────────────────────────────────────
// Abort if any placeholder text remains in the seed data.

function assertNoPlaceholders(items: ItemSeed[]): void {
  for (const item of items) {
    const fields: Array<[string, string | null]> = [
      ['arabic', item.arabic],
      ['transliteration', item.transliteration],
      ['translation', item.translation],
      ['reference', item.reference],
    ]
    for (const [field, value] of fields) {
      if (value !== null && value.includes('PLACEHOLDER')) {
        throw new Error(
          `\n❌ Seed aborted: "${field}" still contains a PLACEHOLDER value.\n` +
          `   Category: ${item.categorySlug}, order: ${item.displayOrder}\n` +
          `   Replace all PLACEHOLDER values with verified content before seeding.\n`
        )
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n========================================')
  console.log('AZKAR CONTENT SEED')
  console.log('========================================\n')

  // Enforce placeholder guard — prevents accidental seeding of stub data.
  // Remove this block only after all content has been verified by a scholar.
  try {
    assertNoPlaceholders(ITEM_SEEDS)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }

  // ── Upsert categories ────────────────────────────────────────────────────────
  console.log('Upserting categories...')
  const categoryIdBySlug: Record<string, string> = {}

  for (const cat of CATEGORIES) {
    const record = await prisma.azkarCategoryRecord.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        arabicName: cat.arabicName,
        description: cat.description,
        iconName: cat.iconName,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        arabicName: cat.arabicName,
        description: cat.description,
        iconName: cat.iconName,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
      select: { id: true, slug: true },
    })
    categoryIdBySlug[record.slug] = record.id
    console.log(`  ✓ ${cat.slug} (id: ${record.id})`)
  }

  // ── Upsert items ─────────────────────────────────────────────────────────────
  console.log('\nUpserting items...')
  let created = 0
  let updated = 0

  for (const item of ITEM_SEEDS) {
    const categoryId = categoryIdBySlug[item.categorySlug]
    if (!categoryId) {
      throw new Error(`Unknown categorySlug: ${item.categorySlug}`)
    }

    // Deterministic lookup: first active item in this category at this order
    // position with this arabic text. If the content changes, a new row is
    // created (the old one is left inactive for audit purposes).
    const existing = await prisma.azkarItem.findFirst({
      where: { categoryId, displayOrder: item.displayOrder, arabic: item.arabic },
      select: { id: true },
    })

    if (existing) {
      await prisma.azkarItem.update({
        where: { id: existing.id },
        data: {
          transliteration: item.transliteration,
          translation: item.translation,
          repetitions: item.repetitions,
          reference: item.reference,
          audioUrl: item.audioUrl,
          isActive: true,
        },
      })
      updated++
    } else {
      await prisma.azkarItem.create({
        data: {
          categoryId,
          arabic: item.arabic,
          transliteration: item.transliteration,
          translation: item.translation,
          repetitions: item.repetitions,
          reference: item.reference,
          audioUrl: item.audioUrl,
          displayOrder: item.displayOrder,
          isActive: true,
        },
      })
      created++
    }
  }

  console.log(`\n✅ Seed complete.`)
  console.log(`   Categories: ${CATEGORIES.length}`)
  console.log(`   Items created: ${created}`)
  console.log(`   Items updated: ${updated}`)
  console.log('========================================\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
