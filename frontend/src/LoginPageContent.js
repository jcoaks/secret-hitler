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
                            Secret Hitler es una adaptación del juego de mesa original Secret Hitler,
                            reimaginado para la web.
                            Soporta hasta 10 jugadores, con arte fluido y animaciones con todo el secreto e
                            intriga del original. Está diseñado para ser fácil de jugar en cualquier noche de juegos.<br/><br/>¡Juega gratis en tu navegador, sin anuncios nunca!
                            <br/><br/>
                        </p>
                    </div>
                    <div id={"login-page-description-text-container"}>
                        <p id={"login-page-description-text"}>
                            <br/>
                            Este proyecto es un fork de <a
                                href={"https://github.com/ShrimpCryptid/Secret-Hitler-Online"}
                                rel="noreferrer"
                                target={"_blank"} onClick={this.onClickAbout}>
                                Secret Hitler Online
                            </a>, el cual es de código abierto y está licenciado bajo CC BY-NC-SA 4.0.
                            <br/><br/>
                            Adaptado del juego de mesa original <a href={"https://secrethitler.com"} target={"_blank"} rel="noreferrer" onClick={this.onClickGameWebsite}>
                                Secret Hitler
                            </a> de Goat, Wolf, & Cabbage (© 2016-2020). Secret Hitler Online desarrollado por ShrimpCryptid (© 2020-2023).
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