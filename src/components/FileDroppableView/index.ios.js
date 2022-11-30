import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {requireNativeComponent} from 'react-native';

const FileDroppableViewNative = requireNativeComponent(
    'FileDroppableView',
    null,
);

const propTypes = {
    /** Children to render. */
    children: PropTypes.node.isRequired,

    /** Callback with file drop native event. */
    onDrop: PropTypes.func.isRequired,

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
            <FileDroppableViewNative
                style={this.props.style}
                allowedDataTypes={['public.plain-text', 'public.image', 'public.url']}
                // onDragOver={(event) => {
                //     console.log('onDragOver', event.nativeEvent);
                // }}
                // onDragExit={(event) => {
                //     console.log('onDragExit', event.nativeEvent);
                // }}
                onDrop={(event) => {
                    if (this.props.onDrop) {
                        this.props.onDrop(event.nativeEvent);
                    }

                    return undefined;
                }}
            >
                {this.props.children}
            </FileDroppableViewNative>
        );
    }
}

FileDroppableView.propTypes = propTypes;
FileDroppableView.defaultProps = defaultProps;

export default FileDroppableView;
