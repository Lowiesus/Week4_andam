import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongodb from 'mongodb';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection setup
const client = new mongodb.MongoClient(process.env.MONGO_URI);
const dbName = process.env.MONGODB_NAME || 'retail-store';
const customersCollection = 'customers';
let db; // Declare db here

async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db(dbName); // Assign db after connection
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to the database:', error);
    }
}

//authenticatee token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    //authenHeader = "Bearer <tokenvalue>"

    if (!token) {
        return res.status(401).json({ message: "Access token reqired." });
    }

    jwt.verify(token, process.env.JWT_TOKEN, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid/expired access token." });
        }
        req.user = user;
        next();
    });
};

app.post("/generateToken", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  const token = jwt.sign({ username }, process.env.JWT_TOKEN, {
    expiresIn: "1h",
  });
  res.status(200).json({ token });
});
app.post("/customers", authenticateToken, async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, phone, address } = req.body;

        if (!username || !email || !password || !first_name || !last_name) {
            res.status(400).json({
                message: "Missing required fields",
                fields: ["username", "email", "password", "first_name", "last_name"]
            });
            return;
        }

        const newCustomer = { username, email, password, first_name, last_name, phone, address, Created_at: new Date() }; // Spreading the req.body
        const result = await db.collection(customersCollection).insertOne(newCustomer);

        res.status(201).json({ data: result, message: "Customer created successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

app.put("/customers/:id", async (req, res) => {
    try {
        const {username, email, password, first_name, last_name, phone, address } = req.body; //json
        if (!username || !email || !password || !first_name || !last_name) {
            return res.status(400).json({
                message: "Missing required fields",
                fields: ["username", "email", "password", "first_name", "last_name"]
            });
        }
        
        const customerid = new mongodb.ObjectId(req.params.id);
        const updatedCustomer = {...req.body, Updated_at: new Date() }; // Spreading the req.body
        const result = await db.collection(customersCollection).updateOne({ _id: customerid }, { $set: updatedCustomer });

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.status(200).json({ data: result, message: "Customer updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// Removed stray code outside of route handler
//Routes Here
// Retail Store Customers
app.get("/customers", async (req, res) => {
    try {
        const { username, email } = req.query;
        let filter = {};

        if (username) filter.username = username;
        if (email) filter.email = email;

        const customers = await db.collection(customersCollection).find(filter).toArray();

        res.status(200).json({data: customers, message: "Customers retrieved successfully"});

    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

app.delete("/customers/:id", async (req, res) => {
    try {
        const customerId = new mongodb.ObjectId(req.params.id);
        const result = await db.collection(customersCollection).deleteOne({ _id: customerId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.status(200).json({ data: result, message: "Customer deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

connectToDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
});

app.get("/", (req, res) => {
    res.send("Welcome to the Retail Store API");
});
