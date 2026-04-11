/**
 * FoundIt — Database Seed Script
 * Run: node utils/seed.js
 * Seeds the database with sample users and items for testing.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Item = require('../models/Item.model');
const connectDB = require('../config/db');

const sampleUsers = [
  { name: 'Aryan Sharma', email: 'aryan@iit.ac.in', password: 'password123', college: 'IIT Delhi', role: 'user' },
  { name: 'Priya Mehta', email: 'priya@bits.ac.in', password: 'password123', college: 'BITS Pilani', role: 'user' },
  { name: 'Rohan Verma', email: 'rohan@nit.ac.in', password: 'password123', college: 'NIT Trichy', role: 'user' },
  { name: 'Admin User', email: 'admin@foundit.app', password: 'adminpass123', college: 'FoundIt HQ', role: 'admin' },
];

const sampleItems = (userIds) => [
  {
    title: 'Sony WH-1000XM5 Headphones',
    description: 'Black Sony noise-cancelling headphones with original white leather case. Small scratch on left earcup. Last seen near Library building.',
    type: 'lost', category: 'Electronics', status: 'pending',
    location: { name: 'Main Library, 2nd Floor', coordinates: { type: 'Point', coordinates: [77.2090, 28.6139] } },
    date: new Date('2024-12-28'), userId: userIds[0],
    contact: { name: 'Aryan Sharma', email: 'aryan@iit.ac.in', phone: '+91 9876543210' },
  },
  {
    title: 'Dark Green JanSport Backpack',
    description: 'Found a dark green JanSport bag near cafeteria chairs with textbooks and a water bottle inside.',
    type: 'found', category: 'Bags', status: 'pending',
    location: { name: 'Cafeteria Block B', coordinates: { type: 'Point', coordinates: [77.2100, 28.6145] } },
    date: new Date('2024-12-27'), userId: userIds[1],
    contact: { name: 'Priya Mehta', email: 'priya@bits.ac.in' },
  },
  {
    title: 'Student ID Card – Rohan Verma',
    description: 'BITS Pilani student ID card for Rohan Verma, 2021 batch Computer Science. Please return to hostel reception or security.',
    type: 'lost', category: 'ID/Cards', status: 'pending',
    location: { name: 'Sports Complex', coordinates: { type: 'Point', coordinates: [77.2080, 28.6130] } },
    date: new Date('2024-12-26'), userId: userIds[2],
    contact: { name: 'Rohan Verma', email: 'rohan@nit.ac.in', phone: '+91 9876543211' },
  },
  {
    title: 'Keychain with 3 Keys + Honda Tag',
    description: 'Yellow keyring with 3 keys and a Honda bike tag. Found near parking lot entrance gate.',
    type: 'found', category: 'Keys', status: 'pending',
    location: { name: 'Main Parking Lot', coordinates: { type: 'Point', coordinates: [77.2095, 28.6142] } },
    date: new Date('2024-12-25'), userId: userIds[0],
    contact: { name: 'Aryan Sharma', email: 'aryan@iit.ac.in' },
  },
  {
    title: 'iPhone 14 Pro – Space Black',
    description: 'Space black iPhone 14 Pro with transparent MagSafe case. Small crack at top right corner. Lost during the annual tech fest.',
    type: 'lost', category: 'Electronics', status: 'resolved',
    location: { name: 'Auditorium', coordinates: { type: 'Point', coordinates: [77.2088, 28.6135] } },
    date: new Date('2024-12-24'), userId: userIds[1],
    contact: { name: 'Priya Mehta', email: 'priya@bits.ac.in' },
  },
  {
    title: 'Casio G-Shock Watch – Black',
    description: 'Black Casio G-Shock found on a library reading room table. In excellent condition with original rubber strap.',
    type: 'found', category: 'Jewelry', status: 'pending',
    location: { name: 'Library Reading Room', coordinates: { type: 'Point', coordinates: [77.2092, 28.6140] } },
    date: new Date('2024-12-23'), userId: userIds[2],
    contact: { name: 'Rohan Verma', email: 'rohan@nit.ac.in' },
  },
  {
    title: 'Dell XPS 13 Laptop Charger (65W USB-C)',
    description: 'White Dell XPS 13 charger left in LAB-3 power strip. Has "Aman" written in black marker on the cable.',
    type: 'lost', category: 'Electronics', status: 'pending',
    location: { name: 'Computer Lab Block C', coordinates: { type: 'Point', coordinates: [77.2085, 28.6133] } },
    date: new Date('2024-12-22'), userId: userIds[0],
    contact: { name: 'Aryan Sharma', email: 'aryan@iit.ac.in' },
  },
  {
    title: 'Engineering Mathematics Textbook (Kreyszig)',
    description: 'Found "Advanced Engineering Mathematics" by Kreyszig, 10th edition. Has handwritten notes throughout. Name "Siya" written on first page.',
    type: 'found', category: 'Books', status: 'pending',
    location: { name: 'Hostel Common Room', coordinates: { type: 'Point', coordinates: [77.2098, 28.6148] } },
    date: new Date('2024-12-21'), userId: userIds[1],
    contact: { name: 'Priya Mehta', email: 'priya@bits.ac.in' },
  },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Item.deleteMany({});

    console.log('👥 Seeding users...');
    const users = await User.insertMany(sampleUsers);
    const userIds = users.map((u) => u._id);

    console.log('📦 Seeding items...');
    await Item.insertMany(sampleItems(userIds));

    console.log(`\n✅ Seeded successfully!`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Items: ${sampleItems(userIds).length}`);
    console.log('\n🔑 Test credentials:');
    console.log('   aryan@iit.ac.in / password123');
    console.log('   admin@foundit.app / adminpass123');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seed();
