// controllers/product_controller.js

const fs = require('fs');
const path = require('path');
const dbCon = require('../config/db');

const getProductById = (req, res) => {
    const productId = req.params.id;
    const query = `
        SELECT 
            id, 
            product_name, 
            product_price, 
            stock_quantity, 
            manufacturer, 
            category, 
            CONCAT('http://localhost:5000/public/uploads/', image) AS image_url 
        FROM 
            Product_tbl 
        WHERE 
            id = ?
    `;

    dbCon.query(query, [productId], (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).json({ error: 'Error fetching product' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(results[0]);
    });
};

const updateProduct = (req, res) => {
    const productId = req.params.id;
    const { product_name, product_price, stock_quantity, manufacturer, category } = req.body;
    const pImage = req.file ? req.file.filename : null;

    // Retrieve existing product details
    const getProductQuery = 'SELECT image FROM Product_tbl WHERE product_id = ?';
    dbCon.query(getProductQuery, [productId], (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).json({ error: 'Error fetching product' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const existingImage = results[0].image;

        // Delete existing image if a new image is uploaded
        if (pImage && existingImage) {
            const filePath = path.join(__dirname, '../public/uploads', existingImage);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting existing image:', err);
                }
            });
        }

        // Update product details in the database
        const updateQuery = `
            UPDATE Product_tbl
            SET product_name = ?, product_price = ?, stock_quantity = ?, manufacturer = ?, category = ?, image = ?
            WHERE product_id = ?
        `;
        const values = [product_name, product_price, stock_quantity, manufacturer, category, pImage || existingImage, productId];

        dbCon.query(updateQuery, values, (err, result) => {
            if (err) {
                console.error('Error updating product:', err);
                return res.status(500).json({ error: 'Error updating product' });
            }
            res.json({ message: 'Product updated successfully' });
        });
    });
};

module.exports = {
    getProductById,
    updateProduct
};
