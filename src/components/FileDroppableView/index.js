import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';

const propTypes = {
    /** Children to render. */
    children: PropTypes.node.isRequired,

    /** Styles to be assigned to Container */
    // eslint-disable-next-line react/forbid-prop-types
    style: PropTypes.arrayOf(PropTypes.object),
};

const defaultProps = {
    style: [],
};

class FileDroppableView extends PureComponent {
    render() {
        return (
            <View style={this.props.style}>
                {this.props.children}
            </View>
        );
    }
}

FileDroppableView.propTypes = propTypes;
FileDroppableView.defaultProps = defaultProps;

export default FileDroppableView;
