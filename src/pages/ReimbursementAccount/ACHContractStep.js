import _ from 'underscore';
import lodashGet from 'lodash/get';
import React from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import ExpensifyText from '../../components/ExpensifyText';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import styles from '../../styles/styles';
import CheckboxWithLabel from '../../components/CheckboxWithLabel';
import TextLink from '../../components/TextLink';
import IdentityForm from './IdentityForm';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import * as BankAccounts from '../../libs/actions/BankAccounts';
import Navigation from '../../libs/Navigation/Navigation';
import CONST from '../../CONST';
import * as ValidationUtils from '../../libs/ValidationUtils';
import ONYXKEYS from '../../ONYXKEYS';
import compose from '../../libs/compose';
import * as ReimbursementAccountUtils from '../../libs/ReimbursementAccountUtils';
import reimbursementAccountPropTypes from './reimbursementAccountPropTypes';
import ReimbursementAccountForm from './ReimbursementAccountForm';

const propTypes = {
    /** Name of the company */
    companyName: PropTypes.string.isRequired,

    ...withLocalizePropTypes,

    /** Bank account currently in setup */
    // eslint-disable-next-line react/no-unused-prop-types
    reimbursementAccount: reimbursementAccountPropTypes.isRequired,
};

class ACHContractStep extends React.Component {
    constructor(props) {
        super(props);

        this.addBeneficialOwner = this.addBeneficialOwner.bind(this);
        this.submit = this.submit.bind(this);

        this.state = {
            ownsMoreThan25Percent: ReimbursementAccountUtils.getDefaultStateForField(props, 'ownsMoreThan25Percent', false),
            hasOtherBeneficialOwners: ReimbursementAccountUtils.getDefaultStateForField(props, 'hasOtherBeneficialOwners', false),
            acceptTermsAndConditions: ReimbursementAccountUtils.getDefaultStateForField(props, 'acceptTermsAndConditions', false),
            certifyTrueInformation: ReimbursementAccountUtils.getDefaultStateForField(props, 'certifyTrueInformation', false),
            beneficialOwners: ReimbursementAccountUtils.getDefaultStateForField(props, 'beneficialOwners', []),
        };

        // These fields need to be filled out in order to submit the form (doesn't include IdentityForm fields)
        this.requiredFields = [
            'acceptTermsAndConditions',
            'certifyTrueInformation',
        ];

        // Map a field to the key of the error's translation
        this.errorTranslationKeys = {
            acceptTermsAndConditions: 'beneficialOwnersStep.error.termsAndConditions',
            certifyTrueInformation: 'beneficialOwnersStep.error.certify',
        };

        this.clearError = inputKey => ReimbursementAccountUtils.clearError(this.props, inputKey);
        this.getErrorText = inputKey => ReimbursementAccountUtils.getErrorText(this.props, this.errorTranslationKeys, inputKey);
    }

    /**
     * @returns {Object}
     */
    getErrors() {
        return lodashGet(this.props, ['reimbursementAccount', 'errors'], {});
    }

    /**
     * @returns {Boolean}
     */
    validate() {
        let beneficialOwnersErrors = [];
        if (this.state.hasOtherBeneficialOwners) {
            beneficialOwnersErrors = _.map(this.state.beneficialOwners, ValidationUtils.validateIdentity);
        }

        const errors = {};
        _.each(this.requiredFields, (inputKey) => {
            if (ValidationUtils.isRequiredFulfilled(this.state[inputKey])) {
                return;
            }

            errors[inputKey] = true;
        });
        BankAccounts.setBankAccountFormValidationErrors({...errors, beneficialOwnersErrors});
        return _.every(beneficialOwnersErrors, _.isEmpty) && _.isEmpty(errors);
    }

    removeBeneficialOwner(beneficialOwner) {
        this.setState((prevState) => {
            const beneficialOwners = _.without(prevState.beneficialOwners, beneficialOwner);

            // We set 'beneficialOwners' to null first because we don't have a way yet to replace a specific property without merging it.
            // We don't use the debounced function because we want to make both function calls.
            BankAccounts.updateReimbursementAccountDraft({beneficialOwners: null});
            BankAccounts.updateReimbursementAccountDraft({beneficialOwners});

            // Clear errors
            BankAccounts.setBankAccountFormValidationErrors({});
            return {beneficialOwners};
        });
    }

    addBeneficialOwner() {
        this.setState(prevState => ({beneficialOwners: [...prevState.beneficialOwners, {}]}));
    }

    /**
     * @returns {Boolean}
     */
    canAddMoreBeneficialOwners() {
        return _.size(this.state.beneficialOwners) < 3
            || (_.size(this.state.beneficialOwners) === 3 && !this.state.ownsMoreThan25Percent);
    }

    /**
     * Clear the error associated to inputKey if found and store the inputKey new value in the state.
     *
     * @param {Integer} ownerIndex
     * @param {String} inputKey
     * @param {String} value
     */
    clearErrorAndSetBeneficialOwnerValue(ownerIndex, inputKey, value) {
        this.setState((prevState) => {
            const renamedFields = {
                addressStreet: 'street',
                addressCity: 'city',
                addressState: 'state',
                addressZipCode: 'zipCode',
            };
            const renamedInputKey = lodashGet(renamedFields, inputKey, inputKey);
            const beneficialOwners = [...prevState.beneficialOwners];
            beneficialOwners[ownerIndex] = {...beneficialOwners[ownerIndex], [renamedInputKey]: value};
            if (inputKey !== 'manualAddress') {
                BankAccounts.updateReimbursementAccountDraft({beneficialOwners});
            }
            return {beneficialOwners};
        });

        // dob field has multiple validations/errors, we are handling it temporarily like this.
        if (inputKey === 'dob') {
            this.clearError(`beneficialOwnersErrors.${ownerIndex}.dobAge`);
        }
        this.clearError(`beneficialOwnersErrors.${ownerIndex}.${inputKey}`);
    }

    submit() {
        if (!this.validate()) {
            return;
        }

        // If they did not select that there are other beneficial owners, then we need to clear out the array here. The
        // reason we do it here is that if they filled out several beneficial owners, but then toggled the checkbox, we
        // want the data to remain in the form so we don't lose the user input until they submit the form. This will
        // prevent the data from being sent to the API
        this.setState(prevState => ({
            beneficialOwners: !prevState.hasOtherBeneficialOwners ? [] : prevState.beneficialOwners,
        }),
        () => BankAccounts.setupWithdrawalAccount({...this.state}));
    }

    /**
    * @param {Object} fieldName
    */
    toggleCheckbox(fieldName) {
        this.setState((prevState) => {
            const newState = {[fieldName]: !prevState[fieldName]};
            BankAccounts.updateReimbursementAccountDraft(newState);
            return newState;
        });
        this.clearError(fieldName);
    }

    render() {
        return (
            <>
                <HeaderWithCloseButton
                    title={this.props.translate('beneficialOwnersStep.additionalInformation')}
                    stepCounter={{step: 4, total: 5}}
                    onCloseButtonPress={Navigation.dismissModal}
                    onBackButtonPress={() => BankAccounts.goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.REQUESTOR)}
                    shouldShowBackButton
                />
                <ReimbursementAccountForm
                    onSubmit={this.submit}
                >
                    <ExpensifyText style={[styles.mb5]}>
                        <ExpensifyText>{this.props.translate('beneficialOwnersStep.checkAllThatApply')}</ExpensifyText>
                    </ExpensifyText>
                    <CheckboxWithLabel
                        style={[styles.mb2]}
                        isChecked={this.state.ownsMoreThan25Percent}
                        onPress={() => this.toggleCheckbox('ownsMoreThan25Percent')}
                        LabelComponent={() => (
                            <ExpensifyText>
                                {this.props.translate('beneficialOwnersStep.iOwnMoreThan25Percent')}
                                <ExpensifyText style={[styles.textStrong]}>{this.props.companyName}</ExpensifyText>
                            </ExpensifyText>
                        )}
                    />
                    <CheckboxWithLabel
                        style={[styles.mb2]}
                        isChecked={this.state.hasOtherBeneficialOwners}
                        onPress={() => {
                            this.setState((prevState) => {
                                const hasOtherBeneficialOwners = !prevState.hasOtherBeneficialOwners;
                                const newState = {
                                    hasOtherBeneficialOwners,
                                    beneficialOwners: hasOtherBeneficialOwners && _.isEmpty(prevState.beneficialOwners)
                                        ? [{}]
                                        : prevState.beneficialOwners,
                                };
                                BankAccounts.updateReimbursementAccountDraft(newState);
                                return newState;
                            });
                        }}
                        LabelComponent={() => (
                            <ExpensifyText>
                                {this.props.translate('beneficialOwnersStep.someoneOwnsMoreThan25Percent')}
                                <ExpensifyText style={[styles.textStrong]}>{this.props.companyName}</ExpensifyText>
                            </ExpensifyText>
                        )}
                    />
                    {this.state.hasOtherBeneficialOwners && (
                        <View style={[styles.mb2]}>
                            {_.map(this.state.beneficialOwners, (owner, index) => (
                                <View key={index} style={[styles.p5, styles.border, styles.mb2]}>
                                    <ExpensifyText style={[styles.textStrong, styles.mb2]}>
                                        {this.props.translate('beneficialOwnersStep.additionalOwner')}
                                    </ExpensifyText>
                                    <IdentityForm
                                        style={[styles.mb2]}
                                        onFieldChange={(inputKey, value) => this.clearErrorAndSetBeneficialOwnerValue(index, inputKey, value)}
                                        values={{
                                            firstName: owner.firstName || '',
                                            lastName: owner.lastName || '',
                                            street: owner.street || '',
                                            city: owner.city || '',
                                            state: owner.state || '',
                                            zipCode: owner.zipCode || '',
                                            dob: owner.dob || '',
                                            ssnLast4: owner.ssnLast4 || '',
                                            manualAddress: owner.manualAddress,
                                        }}
                                        errors={lodashGet(this.getErrors(), `beneficialOwnersErrors[${index}]`, {})}
                                    />
                                    {this.state.beneficialOwners.length > 1 && (
                                        <TextLink onPress={() => this.removeBeneficialOwner(owner)}>
                                            {this.props.translate('beneficialOwnersStep.removeOwner')}
                                        </TextLink>
                                    )}
                                </View>
                            ))}
                            {this.canAddMoreBeneficialOwners() && (
                                <TextLink onPress={this.addBeneficialOwner}>
                                    {this.props.translate('beneficialOwnersStep.addAnotherIndividual')}
                                    <ExpensifyText style={[styles.textStrong, styles.link]}>{this.props.companyName}</ExpensifyText>
                                </TextLink>
                            )}
                        </View>
                    )}
                    <ExpensifyText style={[styles.mv5]}>
                        {this.props.translate('beneficialOwnersStep.agreement')}
                    </ExpensifyText>
                    <CheckboxWithLabel
                        style={[styles.mt4]}
                        isChecked={this.state.acceptTermsAndConditions}
                        onPress={() => this.toggleCheckbox('acceptTermsAndConditions')}
                        LabelComponent={() => (
                            <View style={[styles.flexRow]}>
                                <ExpensifyText>{this.props.translate('common.iAcceptThe')}</ExpensifyText>
                                <TextLink href="https://use.expensify.com/achterms">
                                    {`${this.props.translate('beneficialOwnersStep.termsAndConditions')}`}
                                </TextLink>
                            </View>
                        )}
                        errorText={this.getErrorText('acceptTermsAndConditions')}
                        hasError={this.getErrors().acceptTermsAndConditions}
                    />
                    <CheckboxWithLabel
                        style={[styles.mt4]}
                        isChecked={this.state.certifyTrueInformation}
                        onPress={() => this.toggleCheckbox('certifyTrueInformation')}
                        LabelComponent={() => (
                            <ExpensifyText>{this.props.translate('beneficialOwnersStep.certifyTrueAndAccurate')}</ExpensifyText>
                        )}
                        errorText={this.getErrorText('certifyTrueInformation')}
                        hasError={this.getErrors().certifyTrueInformation}
                    />
                </ReimbursementAccountForm>
            </>
        );
    }
}

ACHContractStep.propTypes = propTypes;
export default compose(
    withLocalize,
    withOnyx({
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
        reimbursementAccountDraft: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT_DRAFT,
        },
    }),
)(ACHContractStep);