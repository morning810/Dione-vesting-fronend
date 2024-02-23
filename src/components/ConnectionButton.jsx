
import { useRef } from 'react';
import './ConnectionButton.css';

import { Web3Button } from "@web3modal/react";

function ConnectionButton({ className, label = "Click me" }) {

    // Create a reference for the wrapper of the inner button
    const web3ButtonWrapperRef = useRef(null);

    // onClick handler for the outer button
    const handleOuterButtonClick = () => {
        // Use the ref to get the actual button inside the wrapper and click it
        if (web3ButtonWrapperRef.current) {
            const button = web3ButtonWrapperRef.current.querySelector('#web3_button');
            console.log("web 3 button >>> ", button);
            if (button) {
                button.click();
            }
        }
    };

    return (
        // <button className={`image-button1 ${className}`} onClick={handleOuterButtonClick}>
        //     {label}
        // <div className='w-0 h-0 ' ref={web3ButtonWrapperRef}>
        <Web3Button
            className="web3button"
            id="web3_button"
            icon='hide'
            label='Connect Wallet'
            balance='hide'
        />
        // </div>
        // </button>
    );

}

export default ConnectionButton;

