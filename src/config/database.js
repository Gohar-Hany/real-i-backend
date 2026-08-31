import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DATABASE || 'raad-rag';

    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(uri, { dbName });

    console.log(`✅ MongoDB connected → database: "${dbName}"`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
