import React, {Component} from "react";
import ReactGA from "react-ga";
import "./LoginPageContent.css";
import "./util/CustomAliceCarousel.css";


class LoginPageContent extends Component {

    onClickAbout = () => {
        ReactGA.event({
            category: "Clicked About",
            action: "User clicked the link for the about page."
        });
    };

    onClickGameWebsite = () => {
        ReactGA.event({
            category: "Clicked Game Website",
            action: "User clicked the link for the board game website."
        });
    };

    render() {
        return (
            <>
                <div id={"#login-page-description-container"}>
                    <div id={"login-page-description-text-container"}>
                        <h2 id={"login-page-description-text-header"}>¿Qué es Secret Hitler?</h2>
                        <p id={"login-page-description-text"}>
                            Un juego de deducción social para 5-10 jugadores. Los liberales deben descubrir y detener al Hitler secreto antes de que sea demasiado tarde. Basado en el <a href={"https://secrethitler.com"} target={"_blank"} rel="noreferrer" onClick={this.onClickGameWebsite}>
                                juego de mesa original
                            </a>, ahora disponible para jugar online y en español.
                        </p>
                    </div>
                    <div id={"login-page-description-text-container"}>
                        <p id={"login-page-description-text"}>
                            Este proyecto es un fork de <a
                                href={"https://github.com/ShrimpCryptid/Secret-Hitler-Online"}
                                rel="noreferrer"
                                target={"_blank"} onClick={this.onClickAbout}>
                                Secret Hitler Online
                            </a>, de código abierto bajo licencia CC BY-NC-SA 4.0.
                        </p>
                        <p id={"login-page-description-text"}>
                            Código fuente disponible en <a
                                href={"https://github.com/jcoaks/secret-hitler"}
                                rel="noreferrer"
                                target={"_blank"}>
                                GitHub
                            </a>.
                        </p>
                        <br/>
                    </div>

                </div>
            </>
        );
    }

}

/*
<div id={"login-page-carousel-container"}>
                        <AliceCarousel mouseTracking items={items} />
                    </div>
 */

LoginPageContent.propTypes = {
};

export default LoginPageContent;