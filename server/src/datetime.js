'use strict';

const shunt = () => {};
let log = console;


const DATE_RE = /^([0-9]{4})([0-9]{2})([0-9]{2})$/;  // 20230121
const TIME_RE = /^([0-9]{2})([0-9]{2})([0-9]{2})[.]([0-9]{3})$/;  // 224430.945

function convert_date_time_into_ms(date_str, time_str) {
    let milliseconds = '';
    if (!date_str || !date_str.length || !time_str || !time_str.length) {
        return milliseconds;
    }

    let date_parts = DATE_RE.exec(date_str);
    let time_parts = TIME_RE.exec(time_str);

    if (!date_parts || !time_parts) {
        return milliseconds;
    }

    let [match1, YYYY, MM, DD] = date_parts;
    let [match2, HH, mm, ss, sss] = time_parts;
    let iso_date_time_str = `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}.${sss}Z`;  // 2023-01-21T22:44:30.945Z
    milliseconds = Date.parse(iso_date_time_str);
    return milliseconds;
}


function convert_time_into_seconds(time_str) {
    let seconds = '';
    if (!time_str || !time_str.length) {
        return seconds;
    }

    let milliseconds = convert_date_time_into_ms('19700101', time_str);
    let ms_str = String(milliseconds);
    if (ms_str.length < 4) {
        ms_str = '0000'.substr(0, 4-ms_str.length) + ms_str;
    }
    seconds = `${ms_str.substr(0, ms_str.length-3)}.${ms_str.substr(-3, 3)}`;
    return seconds;
}


async function tests() {
    log = console;
    let date_str = process.argv[2];
    let time_str = process.argv[3];
    let ms = convert_date_time_into_ms(date_str, time_str);
    log.log('date+time milliseconds:', ms);
    let seconds = convert_time_into_seconds(time_str);
    log.log('time seconds:', seconds);
}


if (require.main === module) {
    tests();
}


module.exports = { convert_date_time_into_ms, convert_time_into_seconds };
