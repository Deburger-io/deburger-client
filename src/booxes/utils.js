export const chunker = {
    chunk: async function (file, chunkSize) {
        const _chunkSize = chunkSize ? chunkSize : 1024 * 16;
        let start = 0;
        let end = file.size;
        let chunks = [];
        let id = Math.random().toString(36).substr(2, 9);

        while (start < end) {
            let nextStart = start + _chunkSize;
            let chunk = await file.slice(start, nextStart).arrayBuffer()
            chunks.push(chunk);
            start = nextStart;
        }
        return [{ id: id, name: file.name, type: file.type, count: chunks.length, chunks: [] }, ...chunks];
    },
    rebuilder: {
        file: {},
        rebuild: function (chunk, rebuilt) {
            let utf8decoder = new TextDecoder();
            try {
                //JSON
                let text = utf8decoder.decode(chunk)
                let data = JSON.parse(text);
                this.file = data;
            } catch (e) {
                //ArrayBuffer
                this.file.chunks.push(chunk);
                if (this.file.chunks.length === this.file.count) {
                    let file = new File([new Blob(this.file.chunks)], this.file.name, { type: this.file.type });
                    rebuilt(file);
                }
            }
        }
    }
}

/** This code is from https://www.isummation.com/blog/convert-arraybuffer-to-base64-string-and-vice-versa/ */
export const abtob64 = {
    toBase64: function (buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },
    toArrayBuffer: function (base64, returnBytes) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }

        return returnBytes ? bytes : bytes.buffer;
    }
}

export const encryption = {
    asymmetric: {
        export: async function (key) {
            return await crypto.subtle.exportKey("jwk", key);
        },
        import: async function (key, usages) {
            return await window.crypto.subtle.importKey(
                "jwk", //can be "jwk" or "raw"
                key,
                {   //this is the algorithm options
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256"
                },
                true, //whether the key is extractable (i.e. can be used in exportKey)
                usages
            );
        },
        generateKey: async function () {
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: "SHA-256"
                },
                true,
                ["encrypt", "decrypt"]
            );
            return keyPair;
        },
        encrypt: async function (publicKey, data) {
            let enc = new TextEncoder();
            let encoded = enc.encode(data);
            // let symKey = await encryption.symmetric.generateKey();
            // console.log(symKey);
            // let encrypted = await encryption.symmetric.encrypt(data, symKey);

            //Symkey Encryption
            // let exportedSymKey = await  encryption.symmetric.export(symKey);
            let encrypted = await window.crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP"
                },
                publicKey,
                encoded
            );
            return encrypted;
            // return encryption.glue([encSymkey, encrypted]);
        },
        decrypt: async function (privateKey, data) {
            return await window.crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP"
                },
                privateKey,
                data
            );
        }
    },
    symmetric: {
        export: async function (key) {
            return await crypto.subtle.exportKey("jwk", key);
        },
        generateKey: async function(){
            let key = await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );
            console.log(key.toString());
            return key;
        },
        encrypt: async function (cryptoKey, data) {
            let enc = new TextEncoder();
            let iv = crypto.getRandomValues(new Uint8Array(16));
            let encrypted = await crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv
                },
                cryptoKey,
                enc.encode(data)
            )

            return encryption.glue([iv, encrypted]);
        },
        decrypt: async function (data, password, derived) {
            let salt = new Uint8Array(data.slice(0, 16));
            let iv = new Uint8Array(data.slice(16, 32));
            let content = new Uint8Array(data.slice(32, data.length));
            let saltedPassword = password;
            if (derived) {
                saltedPassword = await this.keys.generate(password, salt);
            }
            let decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-CBC",
                    iv
                },
                saltedPassword,
                content
            );

            return decrypted;
        }
    },
    glue: function(parts){
        let byteLength = 0;
        for(let part of parts){
            byteLength += part.byteLength;
        }
        let glued = new Uint8Array(byteLength);
        let gluedByteLength= 0;
        for(let part of parts){
            glued.set(new Uint8Array(part), gluedByteLength);
            gluedByteLength += part.byteLength;
        }

        return glued;
    }
}
