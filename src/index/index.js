import React from 'react';
import dom from 'react-dom';
import 'common.css';
import styles from './index.css';
import {api} from 'Utils';

var Index = React.createClass({
    getInitialState() {
        return { 
           
        }
    },

    componentDidMount(){
        // api('',{},'POST',false)
        // .then(user=>{
           
        // })
        // .catch(data=>{});
    },


    render() {
        return <div className={styles.container}>
       
        </div>;
    }
    
});


dom.render(<Index />, document.getElementById('container'));
