'use strict'
const express = require('express');
const blockchain = require('./blockchain');
const cors = require('cors')
const user = require('./user');
const fs = require('fs');
const faker = require('faker');
const utils = require('./utils');
const app = express();


const settings = JSON.parse(fs.readFileSync("./near.config.json", 'utf8'));


//console.log(cors())
app.use(cors())
app.use(express.json());

const  PORT = process.env.PORT || 3000;

app.get("/", (req, res)=>{
    console.log("WWWWWW")
    res.status(200).json("Welcome to NEAR Backendless Plugin! ")
})

app.post("/sign", async (req, res) => {
    console.log("QQQQQ")
    let {
        account_id,
        method,
        params,
        deposit,
        gas,
        receiver_id,
        meta,
        callback_url,
        network
    } = req.body;
    res.status(200).send(await blockchain.GetSignUrl(
        account_id,
        method,
        params,
        deposit,
        gas,
        receiver_id,
        meta,
        callback_url,
        network
    ))
})

app.post("/call", async (req,res)=>{
    let {
        account_id,
        private_key,
        attached_tokens,
        attached_gas,
        contract,
        method,
        params,
    } = req.body;

    res.status(200).send(await blockchain.Call(
        account_id,
        private_key,
        attached_tokens,
        attached_gas,
        contract,
        method,
        params
    ))
})

app.get('/logout', async (req,res)=>{
    await blockchain.Logout();
    res.status(200).json("logout! ")

})
app.get('/login', async (req,res)=>{
    // await blockchain.Login();
    // res.status(200).json("login! ")
    // await utils.login();
})

app.post("/init", async (req,res)=>{
    console.log('init')

    if (settings.init_disabled) {
        return res.status(400).send('Method now allowed');
    }

    // req = processRequest(req);
    let {
        master_account_id,
        seed_phrase,
        private_key,
        nft_contract,
        server_host,
        server_port,
        rpc_node,
    } = req.body;

    if (seed_phrase)
        private_key = (await user.GetKeysFromSeedPhrase(seed_phrase)).secretKey;


    let data = await blockchain.Init(
        master_account_id,
        private_key,
        nft_contract,
        server_host,
        server_port,
        rpc_node
    );
    if (!data.error) {
        res.json(data);
        // process.on('SIGINT', function () {
        //     res.json('done')
        //     app.stop({timeout: 1000}).then(async function () {
        //         await start();
        //     });
        // });
    }else{
        console.log('error')
    }
    // return res;
})

app.post('/deploy', async (req, res)=>{
    let {account_id, private_key, seed_phrase, contract} = req.body;

    if (seed_phrase)
        private_key = (await user.GetKeysFromSeedPhrase(seed_phrase)).secretKey;

    res.status(200).send(await blockchain.DeployContract(account_id, private_key, contract));
})

function processRequest(request) {
    console.log(request);
    Object.keys(request.payload).map((key) => {
        switch (request.payload[key]) {
            case '{username}':
                request.payload[key] = faker.internet
                    .userName()
                    .replace(/[^0-9a-z]/gi, '');
                break;
            case '{color}':
                request.payload[key] = faker.internet.color();
                break;
            case '{number}':
                request.payload[key] = faker.random.number();
                break;
            case '{word}':
                request.payload[key] = faker.random.word();
                break;
            case '{words}':
                request.payload[key] = faker.random.words();
                break;
            case '{image}':
                request.payload[key] = faker.random.image();
                break;
        }
    });

    return request;
}

app.get("/keypair", async (req, res)=>{
    res.status(200).json(await user.GenerateKeyPair());
})


const start = async () =>{
    try {
        app.listen(PORT,()=>{
            console.log('Server started on port: ', PORT);
        })
    }catch (e) {
        console.log(e)
    }
}

start();