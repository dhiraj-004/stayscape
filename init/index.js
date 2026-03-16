const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js"); 

const MONGO_URL = "mongodb://127.0.0.1:27017/StayScape";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});
  
  
  const user = await User.findOne({}); 
  
  if(!user) {
      console.log("⚠️ Error: Pehle website par jakar ek naya account (Sign Up) banao!");
      return;
  }

  
  initData.data = initData.data.map((obj) => ({...obj, owner: user._id}));
  
  await Listing.insertMany(initData.data);
  console.log("data was initialized... Sab theek ho gaya!");
};

initDB();