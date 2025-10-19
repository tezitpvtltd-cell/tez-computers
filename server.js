require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({ dialect: 'sqlite', storage: './tez.sqlite', logging: false });

const Product = sequelize.define('Product', { id:{type:DataTypes.STRING,primaryKey:true}, name:DataTypes.STRING, sell_price:DataTypes.FLOAT, stock_qty:DataTypes.INTEGER });
const Customer = sequelize.define('Customer', { id:{type:DataTypes.STRING,primaryKey:true}, name:DataTypes.STRING, phone:DataTypes.STRING });
const Invoice = sequelize.define('Invoice', { id:{type:DataTypes.STRING,primaryKey:true}, date:DataTypes.DATEONLY, subtotal:DataTypes.FLOAT, total:DataTypes.FLOAT, payment_status:DataTypes.STRING, paid_amount:DataTypes.FLOAT });
const InvoiceItem = sequelize.define('InvoiceItem', { id:{type:DataTypes.STRING,primaryKey:true}, qty:DataTypes.INTEGER, unit_price:DataTypes.FLOAT, total_price:DataTypes.FLOAT });

Customer.hasMany(Invoice); Invoice.belongsTo(Customer);
Invoice.hasMany(InvoiceItem); InvoiceItem.belongsTo(Invoice);

const app = express();
app.use(cors()); app.use(bodyParser.json());

(async()=>{ await sequelize.sync(); console.log('DB ready'); })();

app.get('/api/ping', (req,res)=>res.json({ok:true}));

app.post('/api/products', async (req,res)=>{ const id = req.body.id || 'P-'+uuidv4().slice(0,8); const p = await Product.create({id,...req.body}); res.json(p); });
app.get('/api/products', async (req,res)=> res.json(await Product.findAll()));

app.post('/api/customers', async (req,res)=>{ const id = req.body.id || 'C-'+uuidv4().slice(0,8); const c = await Customer.create({id,...req.body}); res.json(c); });
app.get('/api/customers', async (req,res)=> res.json(await Customer.findAll()));

app.post('/api/invoices', async (req,res)=> {
  const id = 'INV-'+uuidv4().slice(0,8);
  const { customerId, date, items, discount } = req.body;
  let subtotal = 0;
  for(const it of items) subtotal += it.qty * it.unit_price;
  const total = subtotal - (discount||0);
  const inv = await Invoice.create({ id, date, subtotal, total, payment_status:'Pending', paid_amount:0, CustomerId: customerId });
  for(const it of items){
    const ii = 'II-'+uuidv4().slice(0,8);
    await InvoiceItem.create({ id:ii, qty:it.qty, unit_price:it.unit_price, total_price:it.qty*it.unit_price, InvoiceId:inv.id });
    // decrease stock if product exists
    const p = await Product.findByPk(it.productId);
    if(p){ p.stock_qty = (p.stock_qty||0) - it.qty; await p.save(); }
  }
  res.json({ invoice: inv });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Server running on', PORT));
