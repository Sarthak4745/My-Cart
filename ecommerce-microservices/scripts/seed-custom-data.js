const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Helper to wait
const delay = ms => new Promise(res => setTimeout(res, ms));

async function seedData() {
  console.log('Starting data seeding...');

  try {
    // 1. PRODUCT SERVICE SEEDING
    console.log('\n--- Seeding Products ---');
    const productConn = mongoose.createConnection('mongodb://localhost:27017/productdb');
    
    const productSchema = new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      originalPrice: Number,
      images: [String],
      category: String,
      size: [String],
      color: [String],
      brand: String,
      availability: Boolean,
      stock: Number,
      rating: Number,
      reviewCount: Number,
      deliveryDays: Number,
      tags: [String],
      featured: Boolean,
      createdAt: { type: Date, default: Date.now }
    });
    const Product = productConn.model('Product', productSchema);

    const newProducts = [
      {
        name: 'ProVision X Smartphone',
        description: 'Latest 5G smartphone with 120Hz OLED display, 256GB storage, and pro-grade camera system.',
        price: 899.99,
        originalPrice: 999.99,
        images: ['https://images.unsplash.com/photo-1598327105666-5b89351cb31b?w=800'],
        category: 'Electronics',
        brand: 'TechTonic',
        availability: true,
        stock: 50,
        tags: ['mobile', 'smartphone', '5g', 'electronics']
      },
      {
        name: 'Titan Gaming Laptop',
        description: 'High-performance gaming laptop with RTX 4080, 32GB RAM, and 1TB NVMe SSD.',
        price: 1999.99,
        images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800'],
        category: 'Electronics',
        brand: 'GameForge',
        availability: true,
        stock: 20,
        tags: ['laptop', 'gaming', 'computer', 'pc']
      },
      {
        name: 'Men\'s Casual Oxford Shirt',
        description: 'Comfortable and breathable cotton casual shirt. Perfect for everyday wear or office.',
        price: 34.99,
        images: ['https://images.unsplash.com/photo-1596755094514-f87e32f6b717?w=800'],
        category: 'Fashion',
        size: ['M', 'L', 'XL'],
        color: ['Blue', 'White'],
        brand: 'UrbanStyle',
        availability: true,
        stock: 100,
        tags: ['shirt', 'men', 'fashion', 'casual']
      },
      {
        name: 'Classic Straight Fit Denim Pants',
        description: 'Durable and stylish classic blue denim jeans with a straight fit.',
        price: 49.99,
        images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800'],
        category: 'Fashion',
        size: ['30', '32', '34', '36'],
        color: ['Blue'],
        brand: 'DenimCo',
        availability: true,
        stock: 80,
        tags: ['pant', 'jeans', 'denim', 'fashion']
      },
      {
        name: 'Elegant Silk Saree',
        description: 'Beautiful traditional silk saree with intricate golden embroidery.',
        price: 129.99,
        images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800'],
        category: 'Fashion',
        color: ['Red', 'Gold'],
        brand: 'TraditionWeave',
        availability: true,
        stock: 40,
        tags: ['saree', 'traditional', 'women', 'fashion']
      }
    ];

    const insertedProducts = await Product.insertMany(newProducts);
    console.log(`Inserted ${insertedProducts.length} custom products.`);
    
    // 2. INVENTORY SERVICE SEEDING
    console.log('\n--- Seeding Inventory ---');
    const inventoryConn = mongoose.createConnection('mongodb://localhost:27017/inventorydb');
    const inventorySchema = new mongoose.Schema({
      productId: String,
      stock: Number,
      reserved: Number,
      warehouse: String,
      lastUpdated: { type: Date, default: Date.now }
    });
    const Inventory = inventoryConn.model('Inventory', inventorySchema);

    const inventoryDocs = insertedProducts.map(p => ({
      productId: p._id.toString(),
      stock: p.stock,
      reserved: 0,
      warehouse: 'main'
    }));
    await Inventory.insertMany(inventoryDocs);
    console.log(`Inserted inventory records for ${inventoryDocs.length} products.`);

    // 3. REVIEW SERVICE SEEDING (Optional to make it look good)
    console.log('\n--- Seeding Reviews ---');
    const reviewConn = mongoose.createConnection('mongodb://localhost:27017/reviewdb');
    const reviewSchema = new mongoose.Schema({
      productId: String,
      userId: String,
      userName: String,
      rating: Number,
      comment: String,
      createdAt: { type: Date, default: Date.now }
    });
    const Review = reviewConn.model('Review', reviewSchema);

    const reviewDocs = insertedProducts.map(p => ({
      productId: p._id.toString(),
      userId: 'dummy_user_id',
      userName: 'Test User',
      rating: 5,
      comment: 'Excellent product! Highly recommended.'
    }));
    await Review.insertMany(reviewDocs);
    console.log(`Inserted 5-star reviews for the new products.`);


    // 4. USER SERVICE SEEDING
    console.log('\n--- Seeding Users ---');
    const userConn = mongoose.createConnection('mongodb://localhost:27017/userdb');
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      phone: String,
      address: String,
      role: String,
      avatar: String,
      createdAt: { type: Date, default: Date.now }
    });
    const User = userConn.model('User', userSchema);

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const newUsers = [
      {
        name: 'Test Customer 1',
        email: 'testuser1@example.com',
        password: hashedPassword,
        role: 'user',
        phone: '123-456-7890',
        address: '123 Test Street, City, Country'
      },
      {
        name: 'Test Admin',
        email: 'admin2@example.com',
        password: hashedPassword,
        role: 'admin',
        phone: '987-654-3210',
        address: 'Admin Office'
      }
    ];

    for (let u of newUsers) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create(u);
        console.log(`Created user: ${u.email} / password123`);
      } else {
        console.log(`User already exists: ${u.email}`);
      }
    }

    // Close connections
    await productConn.close();
    await inventoryConn.close();
    await reviewConn.close();
    await userConn.close();
    
    console.log('\nData seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during data seeding:', error);
    process.exit(1);
  }
}

seedData();
