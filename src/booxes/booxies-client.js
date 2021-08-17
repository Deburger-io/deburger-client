import { abtob64, chunker, encryption } from "./utils";

/* eslint-disable */
export default (function () {
    const url = 'http://localhost:8090/booxes';
    let booxies = {
        receiver: {
            create: function () {
                fetch(`${url}`, {
                    method: 'POST', headers: new Headers({
                        'Content-Type': 'application/json'
                    })
                }).then(async function (response) {
                    let data = await response.json();
                    console.log(data);
                    let keys = await booxies.receiver.keys.generate();
                    window.localStorage.setItem('boox', JSON.stringify({id: data.id , keys: keys}));
                })
            },
            keys: {
                generate: function(){
                    return encryption.keys.pair.generate().then(async function (key) {
                        let ret = { 'public': null, 'private' : null }
                        let pubk = await encryption.keys.pair.export(key.publicKey);
                        let enc = new TextEncoder();
                        let encodedPubk = enc.encode(JSON.stringify(pubk))
                        ret.public = abtob64.toBase64(encodedPubk.buffer);

                        let prk = await encryption.keys.pair.export(key.privateKey);
                        let encodedPrk = enc.encode(JSON.stringify(prk))
                        ret.private = abtob64.toBase64(encodedPrk.buffer);
                        return ret;
                    })
                }
            },
        },
        sender: {
            keys: {
                read: function(b64key){
                    let key = abtob64.toArrayBuffer(b64key)
                    let decoder = new TextDecoder();
                    let jsonKey = JSON.parse(decoder.decode(key));
                    return jsonKey;
                }
            },
            send: async function (data, boox, encodedpkey) {
                let strData = JSON.stringify(data);
                //Import asymmetric key
                let jsonPublicKey = this.keys.read(encodedpkey);
                let publicKey = await encryption.asymmetric.import(jsonPublicKey, ['encrypt']);
                //Generate symmetric key
                let symKey = await encryption.symmetric.generateKey();
                let jsonSymKey = await encryption.symmetric.export(symKey)
                let encryptedData = await encryption.symmetric.encrypt(symKey, strData);
                let encryptedKey = await encryption.asymmetric.encrypt(publicKey, JSON.stringify(jsonSymKey));
                chunker.chunk(new File([encryptedData], 'bug'), 1024 * 16).then(chunks => {
                    fetch(`${url}/${boox}/files`, {
                        method: 'POST', body: JSON.stringify(chunks[0]), headers: new Headers({
                            'Content-Type': 'application/json'
                        })
                    }).then(async function (response) {
                        let res = await response.json();
                        let fid = res.id;

                        let encryptedKeyB = abtob64.toBase64(encryptedKey);
                        await     fetch(`${url}/${boox}/files/${fid}/key`, {
                            method: 'POST', body: encryptedKeyB, headers: new Headers({
                                'Content-Type': 'application/octet-stream'
                            })
                        })
                        for (let i = 1; i < chunks.length; i++) {
                            let data = abtob64.toBase64(chunks[i]);
                            fetch(`${url}/${boox}/files/${fid}`, {
                                method: 'POST', body: data, headers: new Headers({
                                    'Content-Type': 'application/octet-stream'
                                })
                            }).then(function (response) {
                                console.log(response);
                            })
                        }
                    })
                })
            }
        },
    }
    return booxies;
})();
