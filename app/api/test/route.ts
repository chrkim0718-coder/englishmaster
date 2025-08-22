import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  console.log("🔄 Test API called")
  return NextResponse.json({ message: "Test API works!" })
}

export async function POST() {
  console.log("🔄 Test POST API called")
  return NextResponse.json({ message: "Test POST API works!" })
}
