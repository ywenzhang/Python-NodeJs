'use strict';

const express = require('express');
const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const app = express();

// [START hello_world]
// Say hello!
app.get('/', (req, res) => {
    res.status(200).send('Hello, world!');
});
// [END hello_world]
// [START update]
app.post('/update/:user/:day/:hour/:step/', async (req, res, next) => {
    const userID = req.params.user;
    const day = req.params.day;
    const hour = req.params.hour;
    const step = req.params.step;
    console.log(userID);
    console.log(day);
    console.log(hour);
    console.log(step);
    const stepI = parseInt(step);
    const hourI = parseInt(hour);
    const dayI = parseInt(day);
    if (dayI < 0 || hourI < 0 || stepI < 0 || hourI > 23 || stepI > 5000) {
        res.write('invalid number');
        res.status(400);
    }
    const update_record_key = ds.key(['UpdateRecord', userID]);
    const unique_key = userID + day;
    const step_record_key = ds.key(['StepRecord', unique_key]);
    const keys = [update_record_key, step_record_key];
    const [records] = await ds.get(keys);
    console.log(records);
    if(records.length === 0){
        const step_record = {
            step: new Array(24).fill(0)
        }
        step_record.step[hourI] = step;
        const update_record = {
            mostRecentDay:dayI,
        }
        const entities = [
            {
                key:step_record_key,
                data:step_record,
            },
            {
                key:update_record_key,
                data:update_record
            },
        ];
        await ds.upsert(entities);
    }
    else{
        const entities = [];
        //console.log(records[0]);
        if(records[0].mostRecentDay<dayI){
            records[0].mostRecentDay = dayI;
            entities.push(records[0]);
        }
        if(records.length === 1){
            const step_record = {
                step: new Array(24).fill(0)
            }
            step_record.step[hourI] = step;
            const step_record_entity = {
                key:step_record_key,
                data:step_record,
            }
            entities.push(step_record_entity)
        }
        else{
            //console.log(records[1].step[hourI]);
            records[1].step[hourI] = stepI;
            entities.push(records[1]);
        };
        await ds.upsert(entities);
    };
    res.write('succeeded');
});
// [End update]

// [Start emptying the database]
app.post('/delete', async (req, res, next) => {
    const queryStepRecord = ds.createQuery("StepRecord");
    //console.log(query);
    const [stepRecords] = await ds.runQuery(queryStepRecord);
    const queryUpdateRecord = ds.createQuery('UpdateRecord');
    const [updateRecords] = await ds.runQuery(queryUpdateRecord);
    const batch = [];
    //console.log(entities);

    //const a = [4,5,6];
    for(let i in stepRecords){
        //console.log(entities[i]);
        batch.push(stepRecords[i][ds.KEY]);
    }
    for(let i in updateRecords){
        //console.log(entities[i]);
        batch.push(updateRecords[i][ds.KEY]);
    }
    //console.log(batch);
    await ds.delete(batch);
})
// [End emptying the database]
if (module === require.main) {
    // [START server]
    // Start the server
    const server = app.listen(process.env.PORT || 8080, () => {
        const port = server.address().port;
        console.log(`App listening on port ${port}`);
    });
    // [END server]
}

module.exports = app;