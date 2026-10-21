import React, { Component } from "react";
import ButtonPrompt from "./ButtonPrompt";
import { SERVER_TIMEOUT } from "../constants";
import { SendWSCommand, WSCommandType } from "../types";

type VetoPromptProps = {
  sendWSCommand: SendWSCommand;
  electionTracker: number;
};

type VetoPromptState = {
  waitingForServer: boolean;
};

class VetoPrompt extends Component<VetoPromptProps, VetoPromptState> {
  constructor(props: VetoPromptProps) {
    super(props);
    this.state = {
      waitingForServer: false,
    };
  }

  onButtonClick(accepted: boolean) {
    this.setState({ waitingForServer: true });
    setTimeout(
      () => this.setState({ waitingForServer: false }),
      SERVER_TIMEOUT
    );

    this.props.sendWSCommand({
      command: WSCommandType.REGISTER_PRESIDENT_VETO,
      veto: accepted,
    });
  }

  render() {
    return (
      <ButtonPrompt
        label={"VETO LEGISLATIVO"}
        renderHeader={() => {
          return (
            <>
              <p className={"left-align"}>
                El canciller ha solicitado vetar la agenda.
              </p>
              {this.props.electionTracker === 2 && (
                <p className={"left-align highlight"}>
                  Si el veto es aceptado, la política superior del mazo de robo será
                  promulgada automáticamente.
                </p>
              )}
              {this.props.electionTracker !== 2 && (
                <p className={"left-align"}>
                  Si el veto es aceptado, las políticas restantes serán
                  descartadas y el rastreador de elecciones avanzará 1.
                </p>
              )}
              <p className={"left-align"}>
                De lo contrario, el canciller deberá promulgar una política como
                normal.
              </p>
              <br />
            </>
          );
        }}
        footerText={"¿Aceptar el veto?"}
        renderButton={() => {
          return (
            <>
              <button
                onClick={() => this.onButtonClick(false)}
                disabled={this.state.waitingForServer}
              >
                RECHAZAR
              </button>
              <button
                onClick={() => this.onButtonClick(true)}
                disabled={this.state.waitingForServer}
              >
                ACEPTAR
              </button>
            </>
          );
        }}
      />
    );
  }
}

export default VetoPrompt;
