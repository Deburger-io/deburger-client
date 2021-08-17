const booxies = require('../../booxes/booxies-client').default
export default {
    template: require('./modal.html').default,
    load: function () {
        document.body.insertAdjacentHTML('beforeend', this.template);

        //Gif generation and events
        window.deburger.capture.screen.afterGifGenerated = function (gif) {
            document.getElementById('deburger-gif').src = gif;
            // document.getElementById('deburger-gif').style.display = 'block';
            // document.getElementById('deburger-pregif').style.display = 'none';
        }
        document.getElementById('deburger-gif').addEventListener('click', function () {
            let w = window.open('about:blank');
            let image = document.getElementById('deburger-gif');
            setTimeout(function () {
                w.document.write(image.outerHTML);
            }, 0);
        })

        //Form submit
        document.getElementById('deburger-bug-form').addEventListener('submit', function (e) {
            e.preventDefault();
            console.log('form submitted');
            const formData = new FormData(e.target);
            const formProps = Object.fromEntries(formData);
            console.log(window.deburger.capture.read());
            let bug = Object.assign(window.deburger.capture.read(), formProps);
            booxies.sender.send(bug,window.deburger.options.boox, window.deburger.options.pubKey)

            e.target.reset();
        })
    }
}
