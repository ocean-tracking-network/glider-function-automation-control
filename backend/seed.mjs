import './loadEnvironment.mjs'
import db from './db/conn.mjs'
import { hashPassword } from './utils/auth.mjs'

//DATABASE SEED FOR EMPTY USER DB.
//CREATING A USER NEEDS AN ADMIN USER TO EXIST, IN ORDER TO GET THE AUTH TOKEN
//WHEN ADDING A USER PUT docker-compose exec backend node seed.mjs IN THE TERMINAL


const seedDatabase = async () => {
  try {
    const collection = await db.collection('users')

    // Check if seed users already exist
    const existingAdmin = await collection.findOne({ username: 'testadmin' })
    const existingViewer = await collection.findOne({ username: 'viewer' })
 

    // Delete old seed users if they exist
    if (existingAdmin) await collection.deleteOne({ username: 'testadmin' })
    if (existingViewer) await collection.deleteOne({ username: 'testviewer' })

    // Create default admin user
    const passwordHash = await hashPassword('123')
    const result = await collection.insertOne({
      username: 'testadmin',
      passwordHash,
      role: 'admin',
      createdAt: new Date(),
    })

    // Create default viewer user
    const viewerPasswordHash = await hashPassword('456')
    const result2 = await collection.insertOne({
      username: 'testviewer',
      passwordHash: viewerPasswordHash,
      role: 'viewer',
      createdAt: new Date(),
    })

    console.log('Seeded database with users:')
    console.log(`  Admin - Username: testadmin, Password: 123`)
    console.log(`  Viewer - Username: testviewer, Password: 456`)
    process.exit(0)
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seedDatabase()
