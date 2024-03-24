let docElement = document.documentElement;
const docRect = docElement.getBoundingClientRect();
const rootStyles = getComputedStyle(docElement);
const HIGHLIGHT_COLOR = rootStyles.getPropertyValue('--highlight-color') ?? '#F8AA31';
const TOOLTIP_ANIMATION_TIME = parseFloat(rootStyles.getPropertyValue('--tooltip-animation-time') ?? 0.3) * 400 + 100;
const MOBILE_WIDTH = 720;
const MIN_MOBILE_HEIGHT = 580;
const MIN_WIDGET_WIDTH = 590;

const setExperience = (params, resultNode, disabledNodes = []) => {
    if (!(resultNode instanceof HTMLElement)) return;

    const areDisabled = (Array.isArray(disabledNodes) && disabledNodes.length) ? disabledNodes.every((node) => node instanceof HTMLElement) : false;
    let current = parseInt(resultNode.innerHTML);
    const typeValue = parseInt(params.type);
    const sum = typeValue === 0 ? params.battles * 3 : Math.round(((100 + typeValue) / 100) * (params.battles * 3));
    const neededSteps = Math.abs(sum - current);
    let steps = 0;

    if (areDisabled) {
        disabledNodes.forEach((node) => {
            node.disabled = true;
        });
    }

    const interval = setInterval(() => {
        steps++;

        if (sum < current) {
            current--;
        } else if (sum > current && params.battles) {
            current++;
        }

        resultNode.innerHTML = `${current}`;

        if (steps >= neededSteps) {
            clearInterval(interval);

            if (areDisabled) {
                disabledNodes.forEach((node) => {
                    node.disabled = false;
                });
            }
        }
    }, 5);
}

const fetchTooltip = async (url) => {
    try {
        const response = await fetch(url);

        return await response.text();
    } catch (error) {
        console.error('An error occurred while fetching the tooltip:', error);
    }
};

const setTooltipCoordinates = (tooltip, element) => {
    const tankRect = element.getBoundingClientRect();
    const tanksContainerRect = element.closest('.experiences').getBoundingClientRect();

    if (docRect.width >= MOBILE_WIDTH) {
        if (tanksContainerRect.left === tankRect.left || (tankRect.left - tanksContainerRect.left) <= 15) {
            tooltip.style.left = '15px';
            tooltip.classList.add('tooltip-left');
        } else if (tanksContainerRect.right === tankRect.right || (tanksContainerRect.right - tankRect.right) <= 15) {
            tooltip.style.right = '15px';
            tooltip.classList.add('tooltip-right');
        }

        if ((tanksContainerRect.width - 30) > MIN_WIDGET_WIDTH) {
            docElement.style.setProperty('--tooltip-width', '670px');
        } else {
            tooltip.classList.add('tooltip-mobile');
        }
    } else {
        if ((tanksContainerRect.width - 30) < MIN_WIDGET_WIDTH) {
            tooltip.classList.add('tooltip-mobile');
        }
    }
};

const scrollToTooltip = (element) => {
    const elemRect = element.getBoundingClientRect();

    if ((window.innerHeight - elemRect.bottom) > MIN_MOBILE_HEIGHT || docRect.width > MOBILE_WIDTH) return;

    const top = elemRect.bottom - elemRect.height + window.scrollY;

    window.scroll({
        top,
        behavior: 'smooth'
    });
};

const disableTooltip = (tooltip) => {
    tooltip.className = 'tooltip';
    tooltip.removeAttribute('style');
    docElement.style.setProperty('--tooltip-width', '280px');
};

const setRangeColor = (range, progress) => {
    return `linear-gradient(to right, ${HIGHLIGHT_COLOR} ${progress}%, #1D1D1F ${progress}%)`;
};

document.addEventListener('DOMContentLoaded', () => {
    const tankTooltip = document.querySelectorAll('[data-tooltip].tank');
    let tooltipTimeout;

    tankTooltip.forEach((tank, index) => {
        let tooltip = tank.querySelector('.tooltip');
        let tankParams = {
            type: '0',
            battles: 0,
        };

        tank.addEventListener('mouseenter', (e) => {
            e.preventDefault();

            tooltipTimeout = setTimeout(async () => {
                let radios = [];

                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.innerHTML = await fetchTooltip('widget/tooltip-content.html');

                    tank.appendChild(tooltip);

                    radios = tooltip.querySelectorAll('.tooltip__configTypeRadio input[type="radio"]');

                    radios.forEach((element) => {
                        element.id = `${element.id}-${index}`;
                        element.name = `${element.name}-${index}`;
                        element.nextElementSibling.setAttribute('for', `${element.id}`);

                        element?.addEventListener('change', (e) => {
                            tankParams.type = e.target.value;

                            if (tankParams.battles) {
                                setExperience(tankParams, result, [ranger, input, ...radios]);
                            }
                        });
                    });
                }

                setTooltipCoordinates(tooltip, tank);

                const ranger = tooltip.querySelector('input[type="range"]');
                const input = tooltip.querySelector('input[type="number"]');
                const result = tooltip.querySelector('.result');



                input.addEventListener('input', (e) => {
                    let value = parseInt(e.target.value);
                    const progress = (value / ranger.max) * 100;

                    if (value < 0 || isNaN(value)) {
                        value = 0;
                    } else if (value > 300) {
                        value = 300;
                    }

                    e.target.value = value;
                    tankParams.battles = value;

                    ranger.value = value;
                    ranger.style.background = setRangeColor(ranger, progress);
                });

                input.addEventListener('change', () => {
                    setExperience(tankParams, result, [ranger, input, ...radios]);
                });

                ranger.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    const tempSliderValue = Number(e.target.value);
                    const progress = (tempSliderValue / ranger.max) * 100;

                    input.value = value;
                    ranger.style.background = setRangeColor(ranger, progress);
                });

                ranger.addEventListener('change', (e) => {
                    tankParams.battles = e.target.value;

                    setExperience(tankParams, result, [ranger, input, ...radios]);
                });

                setTimeout(async () => {
                    tooltip.classList.add('tooltip-active');
                }, 100);

                scrollToTooltip(tank);
            }, 300);
        });

        tank.addEventListener('mouseleave', () => {
            clearTimeout(tooltipTimeout);

            if (tooltip && !tank.classList.contains('active')) {
                tooltip.classList.remove('tooltip-active');

                setTimeout(() => {
                    disableTooltip(tooltip);
                }, TOOLTIP_ANIMATION_TIME);
            }
        });

        document.addEventListener('touchstart', (e) => {
            if (tooltip && !tank.contains(e.target)) {
                setTimeout(() => {
                    disableTooltip(tooltip);
                }, TOOLTIP_ANIMATION_TIME);
            }
        });
    });
});
