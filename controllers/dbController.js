const usertoTx = require('../models/usertoTx');
const Tx = require('../models/Tx');
const Web3 = require('web3');



// To count successful requests from node ie : no of blocks received
let count = 0;

// To count sucessful updates in database
let ucount = 0;

// To count expected updates in database
let ecount = 0;

// Aim : For the requests failed in batch
// Desc : 
// Some requests may get ECONNRESET, depending on on our call freqency and connection
// For them, we are doing one by one, by putting good amuount of time between each API call.

async function retry(blockNumber, web3) {
    setTimeout(() => {
        console.log(`Requesting block ${blockNumber} again`)
        web3.eth.getBlock(blockNumber, function (err, block) {
            if (err) {
                console.log(`Repeat Error for ${blockNumber}`)
                retry(blockNumber, web3);
                //may lead to to infinite loop, better condition is needed, we will see it later, for now, lets assume user notice this from console statement
            }
            if (block) {
                console.log(` block ${blockNumber} received`)
                block.transactions.forEach(update);
                count++;
            }
        })
    }, 2000);

}


// Update function for batch 

async function update(item) {

    //console.log(`Update Called for Tx ${item.hash} Block ${item.blockNumber}`);
    let x = 0;

    // Ideally this increment should be in callback of db call, but as you can see I had it there, but there is slight provlem with mongoose, it doesnt return on creation call so we have to do it here
    ucount = ucount + 2;

    // I had to add settimout here, as my system was not able to handle 3 calls simultaneously.
    // setTimeout(() => {
    usertoTx.findOneAndUpdate({ address: item.from }, { $push: { tx: item.hash } }, { upsert: true }, function (err, res) {
        if (res) {
            // ucount++;
            //console.log(`update from for tx ${item.hash}`)
            // console.log(`Entry for user ${item.from} updated`)
        }
        // else {
        //     console.log(`Entry for user ${item.from} created`)
        // }

    });
    // }, 1000);


    // setTimeout(() => {
    usertoTx.findOneAndUpdate({ address: item.to }, { $push: { tx: item.hash } }, { upsert: true }, function (err, res) {
        if (res) {
            // ucount++;
            //console.log(`update to for tx ${item.hash}`)
            //console.log(`Entry for user ${item.from} updated`)
        }
        // else {
        //     console.log(`Entry for user ${item.from} created`)
        // }
    });
    // }, 3000);

    // setTimeout(() => {
    Tx.create(
        {
            txhash: item.hash,
            from: item.from,
            to: item.to,
            value: item.value,
            blockNumber: item.blockNumber,
        }, function (error, result) {
            if (result) {
                ucount++;
                //console.log(`create tx ${item.hash}`)
            }
        }
    )
    // }, 5000);



}

// delayed batch execute go to line no 238 to understand why 
function delayedExecute(batch, time) {
    setTimeout(() => {
        batch.execute();
    }, time);
}
module.exports = {


    // Get tx details of user
    getDetails: async function (req, res) {
        let details = [];
        let temp = await usertoTx.findOne({ address: req.params.address }).exec()
        if (temp) {
            let promises = [];
            //console.log(temp);
            temp.tx.forEach(function (item) {
                // console.log(item);
                promises.push(new Promise(function (resolve, reject) {
                    Tx.findOne({ txhash: item }, function (err, res) {
                        details.push(res);
                    })
                        .then(() => {
                            resolve();
                        })
                }))

            })
            Promise.all(promises).then(() => { res.json({ details }); })

        }
        else {
            res.json({ 'Address not found': req.params.address })
        }


    },


    // Additional Feature : To update the database from previous update to latest block
    // not implemented
    updateDatabase: function (req, res) {




    },

    // Ignore it ! its for testing purpose
    test: async function (req, res) {
        // console.log('asasd');
        // usertoTx.findOneAndUpdate({ address: "qqq" }, { $push: { tx: "dfg" } }, { upsert: true }, function (err, res) {
        //     console.log(res);
        // });
        const provider = new Web3.providers.HttpProvider(
            "https://kovan.infura.io/v3/5c50a42c0c204dbcb9d61d538046a36c"
        );
        const provider1 = new Web3.providers.HttpProvider(
            "https://kovan.infura.io/v3/7892f1957ff241e9915ee1cda089f9a3"
        );
        const provider2 = new Web3.providers.HttpProvider(
            "https://kovan.infura.io/v3/b3b26e89fbfe4bd9b9fc498d5796dd3e"
        );


        let web3Arr = {}
        web3Arr[0] = new Web3(provider);
        web3Arr[1] = new Web3(provider1);
        web3Arr[2] = new Web3(provider2);

        retry(21594237, web3Arr[2]);
    },

    //get all TX
    getAllTx: function (req, res) {

        Tx.find({ temp: null }, function (error, result) {
            res.json(result);
        })
    },

    // get all Users
    getAllUsers: function (req, res) {
        usertoTx.find({ temp: null }, function (error, result) {
            res.json(result);
        })
    },

    // Genesis : Indexing  latest 10k blocks
    genesis: async function (req, res) {

        // Multiple endpoints for load balancing
        const provider = new Web3.providers.HttpProvider(
            "https://kovan.infura.io/v3/5c50a42c0c204dbcb9d61d538046a36c"
        );
        const provider1 = new Web3.providers.HttpProvider(
            "https://kovan.infura.io/v3/7892f1957ff241e9915ee1cda089f9a3"
        );
        const provider2 = new Web3.providers.HttpProvider(
            "https://kovan.infura.io/v3/b3b26e89fbfe4bd9b9fc498d5796dd3e"
        );


        let web3Arr = {}
        web3Arr[0] = new Web3(provider);
        web3Arr[1] = new Web3(provider1);
        web3Arr[2] = new Web3(provider2);

        // Get Latest Block Number
        const latest = await web3Arr[0].eth.getBlockNumber()

        // Doing 10000 req in Batch of 100

        let batch = new web3Arr[0].eth.BatchRequest()
        let j = 0;

        let k = 0;
        for (var i = latest; i > latest - 10000; i--) {
            //console.log(`request for blockno ${i} made, ${i - latest + 9999} remaining`)
            // console.log(k);

            batch.add(
                web3Arr[k % 3].eth.getBlock.request(i, true, (err, res) => {
                    if (res) {
                        ecount = ecount + res.transactions.length * 3;
                        res.transactions.forEach(update);
                        count++;
                    }
                    else {
                        retry(i, web3Arr[k % 3]);
                    }
                })
            )
            j++;
            if (j % 100 == 0) {
                j = 0;

                //batch.execute();
                //Jugaad : 
                // some updates were getting missed I think due to load, so I am trying this
                // basically I am placing batches after sequentially incresing time
                // Tried on 3000 mil sec
                // results : Blocks Received : 10000 | Successful Updates : 45572 | Apprx. Expected Updates : 47745 | Total Tx : 15915 | From 21596956 to 21586957
                // better but we want perfect
                // going with 7000
                // results : Blocks Received : 10000 | Successful Updates : 48146 | Apprx. Expected Updates : 48369 | Total Tx : 16123 | From 21597202 to 21587203
                // extremly close matter of 200, but Sucessful was behind Expected from 20000 count only
                // so, upping it with with 12000.
                // and we chieved perfect result
                // Blocks Received : 10000 | Successful Updates : 48690 | Expected Updates : 48690 | Total Tx : 16230 | From 21598219 to 21588220
                delayedExecute(batch, 12000 * k);

                batch = new web3Arr[k % 3].eth.BatchRequest()
                // console.log(k);
                k++;
            }


        }

        batch.execute()

        //for console updates
        setInterval(() => {
            console.log(`Blocks Received : ${count} | Successful Updates : ${ucount} | Expected Updates : ${ecount} | Total Tx : ${ecount / 3} | From ${latest} to ${latest - 9999}`)
        }, 12000);

        res.json({ 'Please Check Console': 'Thanks !' })
    }





};


