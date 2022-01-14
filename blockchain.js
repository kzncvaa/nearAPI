'use strict'
const nearApi = require('near-api-js');
// const api = require('./api');
const fs = require('fs');
// const fetch = require('node-fetch');
// const {getNetworkFromRpcNode} = require("./api");
// import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'

const { connect, keyStores, WalletConnection } = nearApi;

const getConfig = require('./config');
const nearConfig = getConfig(process.env.NODE_ENV || 'development')

const settings = JSON.parse(fs.readFileSync("./near.config.json", 'utf8'));

module.exports = {

    Login: async function(){
        await window.WalletConnection.requestSignIn(nearConfig.contractName)
    },
    Logout: async function(){
        window.WalletConnection.signOut()
        window.location.replace(window.location.origin + window.location.pathname)
    },



    GetSignUrl: async function (account_id, method, params, deposit, gas, receiver_id, meta, callback_url, network) {
        try {
            if(!network)
                network = "mainnet";
            const deposit_value = typeof deposit == 'string' ? deposit : nearApi.utils.format.parseNearAmount('' + deposit);
            const actions = [method === '!transfer' ? nearApi.transactions.transfer(deposit_value) : nearApi.transactions.functionCall(method, Buffer.from(JSON.stringify(params)), gas, deposit_value)];
            const keypair = nearApi.utils.KeyPair.fromRandom('ed25519');
            const provider = new nearApi.providers.JsonRpcProvider({url: 'https://rpc.' + network + '.near.org'});
            const block = await provider.block({finality: 'final'});
            const txs = [nearApi.transactions.createTransaction(account_id, keypair.publicKey, receiver_id, 1, actions, nearApi.utils.serialize.base_decode(block.header.hash))];
            const newUrl = new URL('sign', 'https://wallet.' + network + '.near.org/');
            newUrl.searchParams.set('transactions', txs.map(transaction => nearApi.utils.serialize.serialize(nearApi.transactions.SCHEMA, transaction)).map(serialized => Buffer.from(serialized).toString('base64')).join(','));
            newUrl.searchParams.set('callbackUrl', callback_url);
            if (meta)
                newUrl.searchParams.set('meta', meta);
            // console.log(newUrl.href);
            return newUrl.href;
        } catch (e) {
            // return api.reject(e);
            console.log(e);
            return e;
        }
    },
    Call: async function (account_id, private_key, attached_tokens, attached_gas, recipient, method, params) {
        try {
            const account = await this.GetAccountByKey(account_id, private_key);

            const keyPair = nearApi.utils.KeyPair.fromString(private_key);
            const keyStore = new nearApi.keyStores.InMemoryKeyStore();
            await keyStore.setKey("testnet", account_id, keyPair);
            const config = {
                keyStore,
                networkId: "testnet",
                nodeUrl: "https://rpc.testnet.near.org"
            }

            const near = await nearApi.connect(config);
            const walletAccount = new nearApi.WalletAccount(near);
            const accountId = walletAccount.getAccountId();
            //
            // const contract = await near.loadContract(nearConfig.contractName, {
            //
            // })

            console.log("ACCOUNT  " + account.accountId);
            console.log(recipient);
            // await account.signAndSendTransaction(recipient, method);
            console.log("QWERTY  "+await account.functionCall(
                recipient,
                method,
                params,
                attached_gas,
                attached_tokens))
            return await account.functionCall(
                recipient,
                method,
                params,
                attached_gas,
                attached_tokens);
        } catch (e) {
            console.log(e)
        }
    },
    GetAccountByKey: async function (account_id, private_key) {
        try {
            private_key = private_key.replace('"', '');

            const keyPair = nearApi.utils.KeyPair.fromString(private_key);
            const keyStore = new nearApi.keyStores.InMemoryKeyStore();
            keyStore.setKey("testnet", account_id, keyPair)
            const near = await nearApi.connect({
                networkId: "testnet",
                deps: {keyStore},
                masterAccount: account_id,
                nodeUrl: 'https://rpc.testnet.near.org'
            });

            return await near.account(account_id);
        } catch (e) {
            console.log(e)
        }
    },
    Init: async function (master_account_id, master_key, nft_contract, server_host, server_port, rpc_node) {
        try {
            const new_settings = settings;
            if (master_account_id) new_settings.master_account_id = master_account_id;
            if (master_key) new_settings.master_key = master_key;
            if (nft_contract) new_settings.nft_contract = nft_contract;
            if (server_host) new_settings.server_host = server_host;
            if (server_port) new_settings.server_port = server_port;
            if (rpc_node) new_settings.rpc_node = rpc_node;

            await fs.promises.writeFile("./near.config.json", JSON.stringify({
                ...new_settings
            }));

            return ("Settings updated.");
        } catch (e) {
            console.log(e);;
        }
    },

    DeployContract: async function (account_id, private_key, contract_file) {
        try {
            const path = `contracts/${contract_file}`;
            if (!fs.existsSync(path))
                console.log("Contract not found");

            const account = await this.GetAccountByKey(account_id, private_key);

            const data = [...fs.readFileSync(path)];
            const txs = [nearApi.transactions.deployContract(data)];

            let res = await account.signAndSendTransaction(account_id, txs);

            if (contract_file === "nft_simple.wasm")
                await this.Call(account_id, private_key, 0, "100000000000000",
                    account_id, "new", {"owner_id": account_id});

            return res;
        } catch (e) {
            console.log(e);
        }
    }
}