/**
 * seed.ts — Seed Sociedad Gourmet portfolio (19 IG brands).
 *
 * Run with: pnpm --filter @agency/db prisma db seed
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
} as any);

interface SeedBrand {
    name: string;
    instagramHandle: string;
    instagramUserId?: string;
    websiteUrl?: string;
    metaAdAccountId?: string;
    googleAdsCustomerId?: string;
    followerCount: number;
    description?: string;
}

const SOCIEDAD_GOURMET_BRANDS: SeedBrand[] = [
    { name: 'Negroni Rooftop GYE', instagramHandle: '@negroni_gye', followerCount: 101732, websiteUrl: 'https://sociedadgourmet.ec/negroni-rooftop-gye/', description: 'Fine dining rooftop, Guayaquil' },
    { name: 'Negroni', instagramHandle: '@negroni_ec', followerCount: 89174, websiteUrl: 'https://sociedadgourmet.ec/negroni/', description: 'Flagship Negroni, urban sophisticated' },
    { name: 'Negroni Quito', instagramHandle: '@negroni_uio', followerCount: 47881, websiteUrl: 'https://sociedadgourmet.ec/negroni-quito/', googleAdsCustomerId: '2799220639', description: 'Rooftop Quicentro, Quito' },
    { name: 'Lola Sky Bar', instagramHandle: '@lola_sky_bar', followerCount: 46689, websiteUrl: 'https://sociedadgourmet.ec/lola-sky-bar/', description: 'Rooftop bar (DORMANT 413 days)' },
    { name: 'Lola Lolita', instagramHandle: '@lola_izakaya_grill', followerCount: 40688, description: 'Sushi/grill (DORMANT 848 days)' },
    { name: 'Café del Museo', instagramHandle: '@cafedelmuseoec', followerCount: 29214, websiteUrl: 'https://sociedadgourmet.ec/cafe-del-museo/', description: 'Riverside café/bar, Cuenca' },
    { name: 'Hotel Boutique Santa Lucia', instagramHandle: '@hotelsantalucia', followerCount: 25147, websiteUrl: 'https://santaluciahotel.com', description: 'Historic 1859 mansion, Cuenca' },
    { name: 'Royal Palm Galápagos', instagramHandle: '@royalpalmgalapagos', followerCount: 24900, description: 'Luxury eco-hotel, Galápagos' },
    { name: 'Petit Palace', instagramHandle: '@petit_palace_cue', followerCount: 24481, websiteUrl: 'https://sociedadgourmet.ec/petit-palace/', description: 'French restaurant, Cuenca' },
    { name: 'Cantina La Única Cuenca', instagramHandle: '@cantina.launica.cue', followerCount: 22981, websiteUrl: 'https://sociedadgourmet.ec/cantina-la-unica-cuenca/', googleAdsCustomerId: '9613976299', description: 'Mexican cantina, live music' },
    { name: 'Sr Miyagi', instagramHandle: '@sr_miyagi_ec', followerCount: 22187, websiteUrl: 'https://sociedadgourmet.ec/sr-miyagi/', description: 'Asian Street Food' },
    { name: 'Melatte', instagramHandle: '@melattec', followerCount: 15000, websiteUrl: 'https://sociedadgourmet.ec/melatte/', description: 'Ecuadorian coffee specialty café' },
    { name: 'Dark Burger', instagramHandle: '@darkburger_ec', followerCount: 13000, websiteUrl: 'https://sociedadgourmet.ec/dark-burger/', description: 'Dark kitchen burgers (DORMANT 54 days)' },
    { name: 'Cantina La Única Cumbaya', instagramHandle: '@cantina.launica.uio', followerCount: 11000, websiteUrl: 'https://sociedadgourmet.ec/cantina-la-unica-cumbaya/', googleAdsCustomerId: '6968953180', description: 'Mexican cantina, Cumbayá (DORMANT 57 days)' },
    { name: 'Gran Salón Negroni', instagramHandle: '@gran_salon_negroni', followerCount: 6000, description: 'Event venue (DORMANT 205 days)' },
    { name: 'La Creme', instagramHandle: '@lacreme_ec', followerCount: 5000, description: 'Fuente de soda / dessert delivery' },
    { name: 'Cocotte', instagramHandle: '@cocotteec', followerCount: 3000, description: 'French bistro' },
    { name: 'Lola Lolita Resto', instagramHandle: '@lolalolita', followerCount: 2500, description: 'Lola Lolita restaurant' },
    { name: 'Zucompra', instagramHandle: '@zucompra_ec', followerCount: 1200, description: 'Wholesale/B2B brand' },
];

async function main() {
    console.log('🌱 Seeding Sociedad Gourmet portfolio…');

    // 1. Organization
    const org = await prisma.organization.upsert({
        where: { id: 'sociedad-gourmet-pilot' },
        update: {},
        create: {
            id: 'sociedad-gourmet-pilot',
            name: 'Sociedad Gourmet',
            industry: 'Restaurants & Hospitality',
            plan: 'PRO',
            autoPilot: false,
        },
    });
    console.log(`✓ Organization: ${org.name}`);

    // 2. Pilot user
    const passwordHash = await bcrypt.hash('Sociedad2026!', 10);
    const user = await prisma.user.upsert({
        where: { email: 'marketingsociedadgourmetec@gmail.com' },
        update: {},
        create: {
            email: 'marketingsociedadgourmetec@gmail.com',
            passwordHash,
            name: 'Sociedad Gourmet Marketing',
            role: 'OWNER',
            organizationId: org.id,
        },
    });
    console.log(`✓ User: ${user.email} (password: Sociedad2026!)`);

    // 3. Seed all 19 brands
    let created = 0;
    for (const b of SOCIEDAD_GOURMET_BRANDS) {
        const existing = await prisma.brand.findFirst({
            where: { organizationId: org.id, name: b.name },
        });
        if (existing) {
            await prisma.brand.update({ where: { id: existing.id }, data: b });
        } else {
            await prisma.brand.create({ data: { ...b, organizationId: org.id } });
            created++;
        }
    }
    console.log(`✓ Brands: ${SOCIEDAD_GOURMET_BRANDS.length} total (${created} new)`);

    console.log('\n✅ Seed complete!');
    console.log('\nLogin: marketingsociedadgourmetec@gmail.com');
    console.log('Pass:  Sociedad2026!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
