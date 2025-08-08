import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

if (!dbName) {
    throw new Error(
      'Please define the MONGODB_DB_NAME environment variable inside .env.local'
    );
  }

let cachedClient: MongoClient | null = null;
let cachedDb: any | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function POST(req: Request) {
  try {
    const { db } = await connectToDatabase();

    const sopData = await req.json();

    // Add the creation date
    sopData.date_created = new Date();

    const sopsCollection = db.collection('sops');
    const result = await sopsCollection.insertOne(sopData);

    return NextResponse.json({
      message: 'SOP created successfully',
      sopId: result.insertedId,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating SOP:', error);
    return NextResponse.json({
      error: 'An error occurred while creating the SOP',
    }, { status: 500 });
  }
}