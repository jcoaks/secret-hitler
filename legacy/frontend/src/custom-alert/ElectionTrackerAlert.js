import React, {Component} from 'react';
import PropTypes from "prop-types";
import ButtonPrompt from "./ButtonPrompt";

import ETBoard from '../assets/board-election-tracker.png';
import ETToken from '../assets/board-tracker.png';

import './ElectionTrackerAlert.css';

class ElectionTrackerAlert extends Component {

    constructor(props) {
        super(props);
        let initialPos = "et-position-" + (this.props.trackerPosition - 1);
        let moveClass = "et-moveto-" + (this.props.trackerPosition);
        this.state = {
            trackerClass: initialPos
        };
        setTimeout(()=>this.setState({trackerClass:moveClass}), 500);
    }

    render() {
        return (
            <ButtonPrompt
                label={"LEGISLATURA FALLIDA"}
                renderHeader={() => {
                    return (<>
                            <p className={"left-align"}>
                                El rastreador de elecciones avanza 1 cada vez que un gobierno falla en
                                (o se niega a) aprobar una política, y se reinicia cuando se aprueba una política.
                            </p>
                            <p className={"left-align highlight"}>
                                Cuando el rastreador llega a 3, la política superior del mazo de robo se aprueba instantáneamente.
                                No se activan poderes presidenciales y todos los límites de mandato se reiniciarán.
                            </p>
                        </>);
                }}
                buttonText={"ACEPTAR"}
                buttonOnClick={this.props.closeAlert}
            >
                <div id={"election-tracker-container"}>
                    <img id="election-tracker-board"
                         src={ETBoard}
                         alt={"The election tracker board. A blue board with four circles, which the election tracker advances along."}
                    />
                    <img id="election-tracker-token"
                         className={this.state.trackerClass}
                         src={ETToken}
                         alt={"The election tracker token. It is at position " + this.props.trackerPosition + " out of 3."}
                     />
                </div>
            </ButtonPrompt>
        )
    }
}

ElectionTrackerAlert.propTypes = {
    trackerPosition: PropTypes.number.isRequired,
    closeAlert: PropTypes.func.isRequired,
};

export default ElectionTrackerAlert;