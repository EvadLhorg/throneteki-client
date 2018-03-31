import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import _ from 'underscore';
import $ from 'jquery';
import 'jquery-migrate';
import 'jquery-nearest';

import CardMenu from './CardMenu';
import CardCounters from './CardCounters';

class Card extends React.Component {
    constructor() {
        super();

        this.onMouseOver = this.onMouseOver.bind(this);
        this.onMouseOut = this.onMouseOut.bind(this);
        this.onMenuItemClick = this.onMenuItemClick.bind(this);

        this.state = {
            showMenu: false
        };

        this.shortNames = {
            stand: 'T',
            poison: 'O',
            gold: 'G',
            valarmorghulis: 'V',
            betrayal: 'B',
            vengeance: 'N',
            ear: 'E',
            venom: 'M',
            kiss: 'K',
            bell: 'L'
        };
    }

    onMouseOver(card) {
        if(this.props.onMouseOver) {
            this.props.onMouseOver(card);
        }
    }

    onMouseOut() {
        if(this.props.onMouseOut) {
            this.props.onMouseOut();
        }
    }

    onCardDragStart(event, card, source) {
        var dragData = { card: card, source: source };

        event.dataTransfer.setData('Text', JSON.stringify(dragData));
    }

    onTouchMove(event) {
        event.preventDefault();
        var touch = event.targetTouches[0];

        event.currentTarget.style.left = touch.pageX - 32 + 'px';
        event.currentTarget.style.top = touch.pageY - 42 + 'px';
        event.currentTarget.style.position = 'fixed';
    }

    getReactComponentFromDOMNode(dom) {
        for(var key in dom) {
            if(key.indexOf('__reactInternalInstance$') === 0) {
                var compInternals = dom[key]._currentElement;
                var compWrapper = compInternals._owner;
                var comp = compWrapper._instance;
                return comp;
            }
        }

        return null;
    }

    onTouchStart(event) {
        this.setState({ touchStart: $(event.currentTarget).position() });
    }

    onTouchEnd(event) {
        var target = $(event.currentTarget);
        var nearestPile = target.nearest('.card-pile, .hand, .player-board');

        var pilePosition = nearestPile.position();
        var cardPosition = target.position();

        if(cardPosition.left + target.width() > pilePosition.left - 10 && cardPosition.left < pilePosition.left + nearestPile.width() + 10) {
            var dropTarget = '';

            if(_.includes(nearestPile.attr('class'), 'hand')) {
                dropTarget = 'hand';
            } else if(_.includes(nearestPile.attr('class'), 'player-board')) {
                dropTarget = 'play area';
            } else {
                var component = this.getReactComponentFromDOMNode(nearestPile[0]);
                dropTarget = component.props.source;
            }

            if(dropTarget && this.props.onDragDrop) {
                this.props.onDragDrop(this.props.card, this.props.source, dropTarget);
            }
        }

        target.css({ left: this.state.touchStart.left + 'px', top: this.state.touchStart.top + 'px' });
        event.currentTarget.style.position = 'initial';
    }

    isAllowedMenuSource() {
        return this.props.source === 'play area' || this.props.source === 'agenda' || this.props.source === 'revealed plots';
    }

    onClick(event, card) {
        event.preventDefault();
        event.stopPropagation();

        if(this.isAllowedMenuSource() && !_.isEmpty(this.props.card.menu)) {
            this.setState({ showMenu: !this.state.showMenu });

            return;
        }

        if(this.props.onClick) {
            this.props.onClick(card);
        }
    }

    onMenuItemClick(menuItem) {
        if(this.props.onMenuItemClick) {
            this.props.onMenuItemClick(this.props.card, menuItem);
            this.setState({ showMenu: !this.state.showMenu });
        }
    }

    getCountersForCard(card) {
        let counters = [];

        if(card.power) {
            counters.push({ name: 'card-power', count: card.power, fade: card.type === 'attachment', shortName: 'P' });
        }

        if(card.baseStrength !== card.strength) {
            counters.push({ name: 'strength', count: card.strength, fade: card.type === 'attachment', shortName: 'S' });
        }

        if(card.dupes && card.dupes.length > 0) {
            counters.push({ name: 'dupe', count: card.dupes.length, fade: card.type === 'attachment', shortName: 'D' });
        }

        _.each(card.iconsAdded, icon => {
            counters.push({ name: icon, count: 0, cancel: false });
        });

        _.each(card.iconsRemoved, icon => {
            counters.push({ name: icon, count: 0, cancel: true });
        });

        _.each(card.tokens, (token, key) => {
            counters.push({ name: key, count: token, fade: card.type === 'attachment', shortName: this.shortNames[key] });
        });

        _.each(card.attachments, attachment => {
            counters = counters.concat(this.getCountersForCard(attachment));
        });

        return _.reject(counters, counter => counter.count < 0);
    }

    getAttachments() {
        if(this.props.source !== 'play area') {
            return null;
        }

        var index = 1;
        var attachments = _.map(this.props.card.attachments, attachment => {
            var returnedAttachment = (<Card key={ attachment.uuid } source={ this.props.source } card={ attachment }
                className={ classNames('attachment', `attachment-${index}`) } wrapped={ false }
                onMouseOver={ this.props.disableMouseOver ? null : this.onMouseOver.bind(this, attachment) }
                onMouseOut={ this.props.disableMouseOver ? null : this.onMouseOut }
                onClick={ this.props.onClick }
                onMenuItemClick={ this.props.onMenuItemClick }
                onDragStart={ ev => this.onCardDragStart(ev, attachment, this.props.source) }
                size={ this.props.size } />);

            index += 1;

            return returnedAttachment;
        });

        return attachments;
    }

    getDupes() {
        if(this.props.source !== 'play area') {
            return null;
        }

        var facedownDupes = _.filter(this.props.card.dupes, card => {
            return card.facedown;
        });

        if(!facedownDupes || facedownDupes.length === 0) {
            return;
        }

        var index = 1;
        var dupes = _.map(facedownDupes, dupe => {
            var returnedDupe = (<Card key={ dupe.uuid } className={ classNames('card-dupe', `card-dupe-${index}`) }
                source={ this.props.source } card={ dupe } wrapped={ false }
                onMouseOver={ this.props.disableMouseOver ? null : this.onMouseOver.bind(this, dupe) }
                onMouseOut={ this.props.disableMouseOver ? null : this.onMouseOut }
                size={ this.props.size } />);

            index += 1;

            return returnedDupe;
        });

        return dupes;
    }

    getCardOrder() {
        if(!this.props.card.order) {
            return null;
        }

        return (<div className='card-order'>{ this.props.card.order }</div>);
    }

    showMenu() {
        if(!this.isAllowedMenuSource()) {
            return false;
        }

        if(!this.props.card.menu || !this.state.showMenu) {
            return false;
        }

        return true;
    }

    showCounters() {
        if(this.props.source !== 'play area' && this.props.source !== 'faction' && this.props.source !== 'revealed plots') {
            return false;
        }

        if(this.props.card.facedown || this.props.card.type === 'attachment') {
            return false;
        }

        return true;
    }

    isFacedown() {
        return this.props.card.facedown || !this.props.card.code;
    }

    getCard() {
        if(!this.props.card) {
            return <div />;
        }

        let cardClass = classNames('card', `card-type-${this.props.card.type}`, this.props.className, this.sizeClass, this.statusClass, {
            'custom-card': this.props.card.code && this.props.card.code.startsWith('custom'),
            'horizontal': this.props.orientation !== 'vertical' || this.props.card.kneeled,
            'vertical': this.props.orientation === 'vertical' && !this.props.card.kneeled,
            'unselectable': this.props.card.unselectable
        });
        let imageClass = classNames('card-image', this.sizeClass, {
            'horizontal': this.props.card.type === 'plot',
            'vertical': this.props.card.type !== 'plot',
            'kneeled': this.props.orientation === 'kneeled' || this.props.card.kneeled || this.props.orientation === 'horizontal' && this.props.card.type !== 'plot'
        });

        return (
            <div className='card-frame' ref='cardFrame'
                onTouchMove={ ev => this.onTouchMove(ev) }
                onTouchEnd={ ev => this.onTouchEnd(ev) }
                onTouchStart={ ev => this.onTouchStart(ev) }>
                { this.getCardOrder() }
                <div className={ cardClass }
                    onMouseOver={ this.props.disableMouseOver ? null : this.onMouseOver.bind(this, this.props.card) }
                    onMouseOut={ this.props.disableMouseOver ? null : this.onMouseOut }
                    onClick={ ev => this.onClick(ev, this.props.card) }
                    onDragStart={ ev => this.onCardDragStart(ev, this.props.card, this.props.source) }
                    draggable>
                    <div>
                        <span className='card-name'>{ this.props.card.name }</span>
                        <img className={ imageClass } src={ '/img/cards/' + (!this.isFacedown() ? (this.props.card.code + '.png') : 'cardback.jpg') } />
                    </div>
                    { this.showCounters() ? <CardCounters counters={ this.getCountersForCard(this.props.card) } /> : null }
                </div>
                { this.showMenu() ? <CardMenu menu={ this.props.card.menu } onMenuItemClick={ this.onMenuItemClick } /> : null }
            </div>);
    }

    get sizeClass() {
        return {
            [this.props.size]: this.props.size !== 'normal'
        };
    }

    get statusClass() {
        if(!this.props.card) {
            return;
        }

        if(this.props.card.selected) {
            return 'selected';
        } else if(this.props.card.selectable) {
            return 'selectable';
        } else if(this.props.card.inDanger) {
            return 'in-danger';
        } else if(this.props.card.saved) {
            return 'saved';
        } else if(this.props.card.inChallenge) {
            return 'challenge';
        } else if(this.props.card.stealth) {
            return 'stealth';
        } else if(this.props.card.controlled) {
            return 'controlled';
        } else if(this.props.card.new) {
            return 'new';
        }
    }

    render() {
        if(this.props.wrapped) {
            return (
                <div className='card-wrapper' style={ this.props.style }>
                    { this.getCard() }
                    { this.getDupes() }
                    { this.getAttachments() }
                </div>);
        }

        return this.getCard();
    }
}

Card.displayName = 'Card';
Card.propTypes = {
    card: PropTypes.shape({
        attached: PropTypes.bool,
        attachments: PropTypes.array,
        baseStrength: PropTypes.number,
        code: PropTypes.string,
        controlled: PropTypes.bool,
        dupes: PropTypes.array,
        facedown: PropTypes.bool,
        iconsAdded: PropTypes.array,
        iconsRemoved: PropTypes.array,
        inChallenge: PropTypes.bool,
        inDanger: PropTypes.bool,
        kneeled: PropTypes.bool,
        menu: PropTypes.array,
        name: PropTypes.string,
        new: PropTypes.bool,
        order: PropTypes.number,
        power: PropTypes.number,
        saved: PropTypes.bool,
        selectable: PropTypes.bool,
        selected: PropTypes.bool,
        stealth: PropTypes.bool,
        strength: PropTypes.number,
        tokens: PropTypes.object,
        type: PropTypes.string,
        unselectable: PropTypes.bool
    }).isRequired,
    className: PropTypes.string,
    disableMouseOver: PropTypes.bool,
    onClick: PropTypes.func,
    onDragDrop: PropTypes.func,
    onMenuItemClick: PropTypes.func,
    onMouseOut: PropTypes.func,
    onMouseOver: PropTypes.func,
    orientation: PropTypes.oneOf(['horizontal', 'kneeled', 'vertical']),
    size: PropTypes.string,
    source: PropTypes.oneOf(['hand', 'discard pile', 'play area', 'dead pile', 'draw deck', 'plot deck', 'revealed plots', 'selected plot', 'attachment', 'agenda', 'faction',
        'additional', 'scheme plots']).isRequired,
    style: PropTypes.object,
    wrapped: PropTypes.bool
};
Card.defaultProps = {
    orientation: 'vertical',
    wrapped: true
};

export default Card;
