import MicroModal from "micromodal";
import deburgerModal from '../deburger-modal/modal.js'
export default {
    template: require('./button.html').default,
    load: function(){
        deburgerModal.load();
        MicroModal.init({
            onClose: function(){
                console.log(deburger);
            }
        });
        document.body.insertAdjacentHTML('beforeend', this.template);
        document.getElementById('deburger-button').addEventListener('click', function(e){
            deburger.capture.stop(['screen']);
            MicroModal.show('deburger-modal');
        })
        deburger.watcher.subscribe('log:error', function(data){
            document.getElementById('deburger-button').classList.toggle('has-message');
            setTimeout(function(){
                document.getElementById('deburger-button').classList.add('no-message');
                //Wait animation end to remove classes
                setTimeout(function(){
                    document.getElementById('deburger-button').classList.remove('no-message');
                    document.getElementById('deburger-button').classList.toggle('has-message');
                },550)
            },4000)
        })
    }
}
