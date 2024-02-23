
import './FooterButton.css'; // Import your CSS file

function ButtonWithBackground({ label = "Click me", className, onClick }) {
    return (
        <button className={`image-button ${className}`} onClick={onClick} >
            {label}
        </button>
    );
}

export default ButtonWithBackground;
