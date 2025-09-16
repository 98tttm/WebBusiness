const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000

app.use(cors())

// API
app.get("/", (req, res)=>{
    res.send("Ok")
})

app.get("/products", (req, res) => {
    res.send(
        [
            {code: 1, name: "Tiger", price: 18000},
            {code: 2, name: "Heineken", price: 19000},
            {code: 3, name: "Sapporo", price: 25000},
            {code: 4, name: "Blanc 1664", price: 22000},
        ]
    )
})

app.listen(port, ()=>{
    console.log(`Server listening on port: ${port}`)
})