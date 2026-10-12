#!/usr/bin/env Rscript
# Independent NHANES 2007–2008 validation for the YIA exploratory model.
# Run with: Rscript scripts/validate_nhanes_survey_model.R /path/to/DEMO_E.xpt /path/to/SMQ_E.xpt /path/to/SPX_E.xpt /path/to/BMX_E.xpt
# Requires: haven, survey
# This script does not modify the workspace or its saved records.

args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 4L) {
  stop("Supply paths to DEMO_E.xpt, SMQ_E.xpt, SPX_E.xpt, BMX_E.xpt in that order.")
}
if (!requireNamespace("haven", quietly = TRUE)) stop("Install package 'haven' first.")
if (!requireNamespace("survey", quietly = TRUE)) stop("Install package 'survey' first.")

demo <- haven::read_xpt(args[[1]])
smq  <- haven::read_xpt(args[[2]])
spx  <- haven::read_xpt(args[[3]])
bmx  <- haven::read_xpt(args[[4]])

# Keep the same one-row-per-SEQN left-join logic as the workspace analysis.
dat <- Reduce(function(x, y) merge(x, y, by = "SEQN", all.x = TRUE, sort = FALSE),
              list(demo, smq, spx, bmx))
if (anyDuplicated(dat$SEQN)) stop("Duplicate SEQN detected after joining source files.")

quality <- toupper(trimws(as.character(dat$SPXNQFV1)))
never <- dat$SMQ020 == 2
current <- dat$SMQ020 == 1 & dat$SMQ040 %in% c(1, 2)
dat$smoking_group <- ifelse(never, "Never",
                            ifelse(current, "Current", NA_character_))
dat$smoking_group <- factor(dat$smoking_group, levels = c("Never", "Current"))
dat$female <- as.integer(dat$RIAGENDR == 2)
dat$age_c <- dat$RIDAGEYR - mean(dat$RIDAGEYR[dat$RIDAGEYR >= 20], na.rm = TRUE)
dat$height_c <- dat$BMXHT - mean(dat$BMXHT, na.rm = TRUE)

# Build the design before subsetting the analytic domain.
design_base <- subset(dat,
  !is.na(WTMEC2YR) & WTMEC2YR > 0 &
  !is.na(SDMVSTRA) & !is.na(SDMVPSU))
des <- survey::svydesign(
  ids = ~SDMVPSU, strata = ~SDMVSTRA, weights = ~WTMEC2YR,
  nest = TRUE, data = design_base
)

analytic <- with(des$variables,
  RIDAGEYR >= 20 &
  !is.na(smoking_group) &
  !is.na(SPXNFEV1) &
  !is.na(BMXHT) &
  quality %in% c("A", "B") &
  SPXNSTAT == 1 &
  !is.na(RIAGENDR) &
  !is.na(age_c) & !is.na(height_c))
# Add the quality variable explicitly to the design data for domain selection.
des$variables$quality <- quality[match(des$variables$SEQN, dat$SEQN)]
analytic <- with(des$variables,
  RIDAGEYR >= 20 &
  !is.na(smoking_group) &
  !is.na(SPXNFEV1) &
  !is.na(BMXHT) &
  quality %in% c("A", "B") &
  SPXNSTAT == 1 &
  !is.na(RIAGENDR) &
  !is.na(age_c) & !is.na(height_c))
des_sub <- subset(des, analytic)
des_sub <- update(des_sub, smoking_group = relevel(smoking_group, ref = "Never"))

fit <- survey::svyglm(
  SPXNFEV1 ~ smoking_group + age_c + female + height_c,
  design = des_sub,
  family = gaussian()
)

cat("\nNHANES 2007–2008 survey-weighted validation\n")
cat("Analytic N:", nrow(des_sub$variables), "\n")
cat("Current smokers:", sum(des_sub$variables$smoking_group == "Current"), "\n")
cat("Never smokers:", sum(des_sub$variables$smoking_group == "Never"), "\n")
cat("Strata:", length(unique(des_sub$variables$SDMVSTRA)), "\n")
cat("PSU-stratum units:", nrow(unique(des_sub$variables[c("SDMVSTRA", "SDMVPSU")])), "\n")
cat("Design degrees of freedom:", survey::degf(des_sub), "\n\n")
print(summary(fit))
cat("\nSmoking coefficient (Current vs Never), in mL:\n")
print(coef(summary(fit))["smoking_groupCurrent", , drop = FALSE])
cat("\n95% confidence interval:\n")
print(confint(fit)["smoking_groupCurrent", , drop = FALSE])
cat("\nNote: compare N and coefficients with the browser model. Any differences must be investigated; do not treat this as final until the sample and design specifications align.\n")
