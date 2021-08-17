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
    keys: {
        salt: {
            generate (size) {
                let _size = size ? size : 16;
                return crypto.getRandomValues(new Uint8Array(_size));
            }
        },
        generate (password, salt) {
            let enc = new TextEncoder();
            return crypto.subtle.importKey(
                "raw",
                enc.encode(password),
                "PBKDF2",
                false,
                ["deriveKey"]).then(function (passwordKey) {
                return crypto.subtle.deriveKey(
                    {
                        name: "PBKDF2",
                        salt: salt,
                        iterations: 250000,
                        hash: "SHA-256",
                    },
                    passwordKey,
                    { name: "AES-CBC", length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );
            });
        },
        pair: {
            generate: async function () {
                const keyPair = await crypto.subtle.generateKey(
                    {
                        name: "RSA-OAEP",
                        modulusLength: 4096,
                        publicExponent: new Uint8Array([1, 0, 1]),
                        hash: "SHA-256"
                    },
                    true,
                    ["encrypt", "decrypt"]
                );
                return keyPair;
            },
            encrypt: async function (publicKey, data) {
                return await window.crypto.subtle.encrypt(
                    {
                        name: "RSA-OAEP"
                    },
                    publicKey,
                    data
                );
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
        export: async function (key) {
            return await crypto.subtle.exportKey("jwk", key);
        },
        import: async function (key) {
            return await window.crypto.subtle.importKey(
                "jwk", //can be "jwk" or "raw"
                key,
                {   //this is the algorithm options
                    name: "AES-CBC",
                },
                true, //whether the key is extractable (i.e. can be used in exportKey)
                ["encrypt", "decrypt"]
            );
        }
    },
    encrypt: async function (data, password, derive) {
        let salt = this.keys.salt.generate();
        let saltedPassword = password;
        if (derive) {
            saltedPassword = await this.keys.generate(password, salt);
        }
        let iv = crypto.getRandomValues(new Uint8Array(16));
        let encrypted = await crypto.subtle.encrypt(
            {
                name: "AES-CBC",
                iv
            },
            saltedPassword,
            data
        )

        var tmp = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
        tmp.set(new Uint8Array(salt), 0);
        tmp.set(new Uint8Array(iv), salt.byteLength);
        tmp.set(new Uint8Array(encrypted), (salt.byteLength + iv.byteLength));
        return tmp;

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
}
