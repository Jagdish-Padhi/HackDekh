import styled from 'styled-components';

type SwitchProps = {
  id: string;
  checked: boolean;
  onChange: () => void;
  activeBg?: string;
};

const Switch = ({ id, checked, onChange, activeBg }: SwitchProps) => {
  return (
    <StyledWrapper $activeBg={activeBg}>
      <div className="checkbox-apple">
        <input
          className="yep"
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
        />
        <label htmlFor={id} />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{ $activeBg?: string }>`
  .checkbox-apple {
    position: relative;
    width: 50px;
    height: 25px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .checkbox-apple label {
    position: absolute;
    top: 0;
    left: 0;
    width: 50px;
    height: 25px;
    border-radius: 50px;
    background: linear-gradient(to bottom, #b3b3b3, #e6e6e6);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  html.dark & .checkbox-apple label {
    background: linear-gradient(to bottom, #3f3f46, #27272a);
  }

  .checkbox-apple label:after {
    content: '';
    position: absolute;
    top: 1px;
    left: 1px;
    width: 23px;
    height: 23px;
    border-radius: 50%;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  }

  html.dark & .checkbox-apple label:after {
    background-color: #e4e4e7;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .checkbox-apple input[type="checkbox"]:checked + label {
    background: ${props => props.$activeBg || 'linear-gradient(to bottom, #4cd964, #5de24e)'};
  }

  .checkbox-apple input[type="checkbox"]:checked + label:after {
    transform: translateX(25px);
  }

  .checkbox-apple label:hover:after {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }

  .yep {
    position: absolute;
    top: 0;
    left: 0;
    width: 50px;
    height: 25px;
    opacity: 0;
    z-index: 2;
    cursor: pointer;
    margin: 0;
  }
`;

export default Switch;
