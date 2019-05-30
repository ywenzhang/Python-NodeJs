'use strict';

const express = require('express');
const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const app = express();

app.set("view engine", "ejs");

app.get('/', (req, res) => {
    res.render("index");
});

// [START update]
app.post('/update/:user/:day/:hour/:step/', async (req, res, next) => {
    const userID = req.params.user;
    const day = req.params.day;
    const hour = req.params.hour;
    const step = req.params.step;
    console.log("user: "+userID);
    console.log("day: "+day);
    console.log("hour: "+hour);
    console.log("step: "+step);
    const stepI = parseInt(step);
    const hourI = parseInt(hour);
    const dayI = parseInt(day);
    if (dayI < 0 || hourI < 0 || stepI < 0 || hourI > 23 || stepI > 5000) {
        res.write('invalid number');
        res.status(400);
        return
    }
    const update_record_key = ds.key(['UpdateRecord', userID]);
    const recordUpdate = await ds.get(update_record_key);
    const unique_key = userID + day;
    const step_record_key = ds.key(['StepRecord', unique_key]);
    const recordStep = await ds.get(step_record_key);
    console.log(recordUpdate);
    console.log(recordStep);
    if(recordUpdate[0] === undefined && recordStep[0] === undefined){
        //console.log("hello")
        const step_record = {
            step: new Array(24).fill(0),
            step_sum: new Array(24).fill(0)
        }
        step_record.step[hourI] = stepI;
        step_record.step_sum[hourI] = stepI;
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
        console.log(recordUpdate);
        if(recordUpdate[0].mostRecentDay<dayI){
            recordUpdate[0].mostRecentDay = dayI;
            entities.push(recordUpdate[0]);
        }
        if(recordStep[0] === undefined){
            console.log('b');
            const step_record = {
                step: new Array(24).fill(0),
                step_sum:new Array(24).fill(0),
            }
            step_record.step[hourI] = stepI;
            step_record.step_sum[hourI] = stepI;
            const step_record_entity = {
                key:step_record_key,
                data:step_record,
            }
            entities.push(step_record_entity)
        }
        else{
            //console.log(records[1].step[hourI]);
            console.log("a");
            console.log(recordStep[0].step);
            if(parseInt(recordStep[0].step[hourI])!=stepI) {
                recordStep[0].step[hourI] = stepI;
                if(hourI===0){
                    recordStep[0].step_sum[hourI] = stepI;
                }
                else{
                    recordStep[0].step_sum[hourI] = stepI+recordStep[0].step_sum[hourI-1];
                }
                entities.push(recordStep[0]);
            }
        };
        console.log(entities)
        await ds.upsert(entities);
    };
    res.write('succeeded');
    return
});
// [End update]

// [Start Current Day Handler]
app.get('/current/:user',async (req, res, next)=>{
    const userID = req.params.user;
    console.log(userID);
    const update_record_key = ds.key(['UpdateRecord', userID]);
    const recordUpdate = await ds.get(update_record_key);
    if(recordUpdate[0]===undefined){
        res.write("user "+userID+" not found");
        return
    }
    const dayI = recordUpdate[0].mostRecentDay;
    const step_record_key = ds.key(['StepRecord',userID+dayI.toString()]);
    const stepRecord = await ds.get(step_record_key);
    var sum = 0;
    for(let i in stepRecord[0].step){
        sum += stepRecord[0].step[i];
    }
    console.log(sum)
    res.write('Total step count on day %d. for %s is %d.',dayI,userID,sum);
    return

})
// [End Current Day Handler]

// [Start Single Day Handler]
app.get('/single/:user/:day',async (req, res, next)=>{
    const userID = req.params.user;
    const day = req.params.day;
    const unique_key = userID + day;
    const step_record_key = ds.key(['StepRecord', unique_key]);
    const stepRecord = await ds.get(step_record_key);
    var sum = 0;
    for(let i in stepRecord[0].step){
        sum += stepRecord[0].step[i];
    }
    console.log(sum)
    res.write('Total step count on day %s for %s is %d.',day,userID,sum);
    return
})
// [End Single Day Handler]

// [Start Single Day Handler]
app.get('/single/:user/:day',async (req, res, next)=>{
    const userID = req.params.user;
    const day = req.params.day;
    const unique_key = userID + day;
    const step_record_key = ds.key(['StepRecord', unique_key]);
    const stepRecord = await ds.get(step_record_key);
    var sum = 0;
    for(let i in stepRecord[0].step){
        sum += stepRecord[0].step[i];
    }
    console.log(sum)
    res.write('Total step count on day %s for %s is %d.',day,userID,sum);
    return
})
// [End Single Day Handler]

// [Start Range Day Handler]
app.get('/range/:startDay/:numDays',async (req, res, next)=>{
    const userID = req.params.user;
    const update_record_key = ds.key(['UpdateRecord',userID]);
    const updateRecord = await ds.get(update_record_key);
    if(updateRecord[0] === undefined){
        res.write("user "+userID+" not found")
        return
    }
    const startDayI = parseInt(req.params.startDay);
    const numDaysI =parseInt(req.params.numDays);
    const mostRecentDay = updateRecord[0].mostRecentDay;
    if(startDayI>mostRecentDay){
        res.write('start day is larger than most recent day')
    }
    const max_day = Math.max(mostRecentDay,startDayI+numDaysI-1)
    var batch  = []
    for(let i=startDayI; i<=max_day;i++){
        const unique_key = ds.key(["StepRecord",userID+i.toString()]);
        const stepRecord = await ds.get(unique_key);
        batch.push(stepRecord[0]);
        console.log(stepRecord[0]);
    }
    return
});
// [End Range Day Handler]

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