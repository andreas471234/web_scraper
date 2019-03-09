let fs = require('fs')
const Promise = require('bluebird');
const requestPromise = require('request-promise');
const $ = require('cheerio');
const puppeteer = require('puppeteer');
const mainUrl = 'https://www.bankmega.com/';
// ajax.promolainnya.php?product=1&subcat=2

const getPromoDetail = function(url) {
    return requestPromise(url)
        .then(function(html) {
            let imageElement = $('.keteranganinside > img', html);
            let imageUrl = '';

            try {
                imageUrl = imageElement[0].attribs.src
            } catch(err) {}

            return {
                title: $('.titleinside > h3', html).text(),
                area: $('.area > b', html).text(),
                periode: $('.periode > b', html).text(),
                imageurl: imageUrl
            };
        })
        .catch(function(err) {
            console.log(err);
        });
};

const getPromoList = function(subCategory, url) {
    return requestPromise(url)
        .then(function(html) {
            let promoUrl = [];
            let promoCount = $('#promolain > li > a', html).length;

            for (let i = 0; i < promoCount; i++) {
                promoUrl.push($('#promolain > li > a', html) [i].attribs.href)
            }

            return Promise.all(
                promoUrl.map(function(url) {
                    return getPromoDetail(mainUrl + url)
                })
            );
        })
        .catch(function(err) {
            console.log(err);
        });
};

const getAllSubCategoryPromo = function(subCategory, url) {
    return requestPromise(url)
        .then(function(html) {
            let promoPageUrl = [];
            let pagingElement = $('.tablepaging > tbody > tr > td:last-child > a', html);
            let pagingCount = 0;

            try {
                let array = pagingElement [0].attribs.title.split(' ');
                pagingCount = parseInt(array[array.length - 1])
            } catch(err) {}

            for (let i = 1; i <= pagingCount; i++) {
                promoPageUrl.push(url + '&page=' + i)
            }

            return Promise.all(
                promoPageUrl.map(function() {
                    return getPromoList(subCategory, url)
                })
            );
        }).then(function(subCategoryJson){
            return {key: subCategory, value: flattenArray(subCategoryJson)}
        })
        .catch(function(err) {
            console.log(err);
        });
}

const flattenArray = function(array) {
    var flattened=[];
    for (var i=0; i<array.length; ++i) {
        var current = array[i];
        for (var j=0; j<current.length; ++j)
            flattened.push(current[j]);
    }
    return flattened
}

const convArrayToObject = function(array) {
    var result = {};
    for (var i=0; i < array.length; i++) {
        result[array[i].key] = array[i].value;
    }
    return result
}

requestPromise(mainUrl + 'promolainnya.php')
    .then(function(html) {
        let subCategoryName = [];
        let promoCategory = $('#subcatpromo > div > img', html).length;

        for (let i = 0; i < promoCategory; i++) {
            subCategoryName.push($('#subcatpromo > div > img', html) [i].attribs.title)
        }

        return Promise.all(
            subCategoryName.map(function(title, index) {
                return getAllSubCategoryPromo(title, mainUrl + 'ajax.promolainnya.php?product=1&subcat=' + (index + 1))
            })
        ).then(function(result){
            fs.writeFile('solution.json', JSON.stringify(convArrayToObject(result), null, 4), function(err){})
        })
    })
    .catch(function(err) {
        console.log(err);
    });
