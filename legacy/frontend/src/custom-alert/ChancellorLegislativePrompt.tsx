import React, { Component } from "react";
import ButtonPrompt from "./ButtonPrompt";
import { SERVER_TIMEOUT } from "../constants";

import "../util/PolicyDisplay.css";
import PolicyDisplay from "../util/PolicyDisplay";
import { PolicyType, SendWSCommand, WSCommandType } from "../types";

type ChancellorLegislativePromptProps = {
  policyOptions: PolicyType[];
  sendWSCommand: SendWSCommand;
  fascistPolicies: number;
  showError: (message: string) => void;
  enableVeto: boolean;
};

type ChancellorLegislativePromptState = {
  selection: number | undefined;
  waitingForServer: boolean;
};

class ChancellorLegislativePrompt extends Component<
  ChancellorLegislativePromptProps,
  ChancellorLegislativePromptState
> {
  constructor(props: ChancellorLegislativePromptProps) {
    super(props);
    this.state = {
      selection: undefined,
      waitingForServer: false,
    };
    this.onEnactButtonClick = this.onEnactButtonClick.bind(this);
    this.onVetoButtonClick = this.onVetoButtonClick.bind(this);
  }

  onEnactButtonClick() {
    if (this.state.selection === undefined) {
      return;
    }
    // Lock the button so that it can't be pressed multiple times.
    this.setState({ waitingForServer: true });
    setTimeout(() => {
      this.setState({ waitingForServer: false });
    }, SERVER_TIMEOUT);

    // Contact the server using provided method.
    this.props.sendWSCommand({
      command: WSCommandType.REGISTER_CHANCELLOR_CHOICE,
      choice: this.state.selection,
    });
  }

  onVetoButtonClick() {
    if (this.props.fascistPolicies === 5) {
      // If veto power is activated:
      // Lock the button so that it can't be pressed multiple times.
      this.setState({ waitingForServer: true });
      setTimeout(() => {
        this.setState({ waitingForServer: false });
      }, SERVER_TIMEOUT);

      this.props.sendWSCommand({
        command: WSCommandType.REGISTER_CHANCELLOR_VETO,
      });
    } else {
      // veto power is not activated
      this.props.showError(
        "El poder de veto se desbloquea cuando hay 5 políticas fascistas."
      );
    }
  }

  // noinspection DuplicatedCode
  render() {
    let props = this.props;
    return (
      <ButtonPrompt
        label={"SESIÓN LEGISLATIVA"}
        headerText={
          "Elige una política para promulgar. La política restante será descartada."
        }
        renderHeader={() => {
          return (
            <>
              <p className={"left-align"}>
                Elige una política para promulgar. La política restante será
                descartada.
              </p>
              {props.fascistPolicies === 5 && (
                <p className={"left-align highlight"}>
                  Poder de veto desbloqueado: Si eliges vetar y el presidente
                  acepta el veto, la agenda será descartada.
                </p>
              )}
            </>
          );
        }}
        renderButton={() => {
          return (
            <div id={"legislative-button-container"}>
              {this.props.enableVeto && (
                <button
                  onClick={this.onVetoButtonClick}
                  disabled={this.state.waitingForServer}
                >
                  VETAR
                </button>
              )}
              <button
                onClick={this.onEnactButtonClick}
                disabled={
                  this.state.selection === undefined ||
                  this.state.waitingForServer
                }
              >
                PROMULGAR
              </button>
            </div>
          );
        }}
      >
        <PolicyDisplay
          policies={this.props.policyOptions}
          onClick={(index: number) => this.setState({ selection: index })}
          selection={this.state.selection}
          allowSelection={true}
        />
      </ButtonPrompt>
    );
  }
}

export default ChancellorLegislativePrompt;
