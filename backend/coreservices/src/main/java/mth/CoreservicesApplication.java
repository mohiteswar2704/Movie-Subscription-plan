package mth;

import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import mth.models.Menus;
import mth.models.Plan;
import mth.models.Roles;
import mth.models.Rolesmapping;
import mth.models.RolesmappingId;
import mth.models.Subscription;
import mth.models.Users;
import mth.repository.MenusRepository;
import mth.repository.PlanRepository;
import mth.repository.RolesRepository;
import mth.repository.RolesmappingRepository;
import mth.repository.SubscriptionRepository;
import mth.repository.UsersRepository;

@SpringBootApplication
public class CoreservicesApplication {

	public static void main(String[] args) {
		SpringApplication.run(CoreservicesApplication.class, args);
	}

	@Bean
	CommandLineRunner seedData(
			UsersRepository usersRepository,
			RolesRepository rolesRepository,
			MenusRepository menusRepository,
			RolesmappingRepository rolesmappingRepository,
			PlanRepository planRepository,
			SubscriptionRepository subscriptionRepository) {

		return args -> {

			// ── 1. Seed Roles ─────────────────────────────────────────────────────────
			Roles userRole = rolesRepository.findById(1L).orElseGet(() -> {
				Roles role = new Roles();
				role.setRole(1L);
				role.setRolename("USER");
				return rolesRepository.save(role);
			});

			Roles adminRole = rolesRepository.findById(99L).orElseGet(() -> {
				Roles role = new Roles();
				role.setRole(99L);
				role.setRolename("ADMIN");
				return rolesRepository.save(role);
			});

			// ── 2. Seed Menus ─────────────────────────────────────────────────────────
			seedMenu(menusRepository, 1L, "Overview",  "dashboard.png");
			seedMenu(menusRepository, 2L, "Plans",     "taskmanager.png");
			seedMenu(menusRepository, 3L, "Status",    "myprofile.png");

			// ── 3. Seed Role-Menu mappings ────────────────────────────────────────────
			// USER (role=1) can access Overview, Plans, Status
			seedMapping(rolesmappingRepository, userRole.getRole(), 1L);
			seedMapping(rolesmappingRepository, userRole.getRole(), 2L);
			seedMapping(rolesmappingRepository, userRole.getRole(), 3L);

			// ADMIN (role=99) can access all menus too
			seedMapping(rolesmappingRepository, adminRole.getRole(), 1L);
			seedMapping(rolesmappingRepository, adminRole.getRole(), 2L);
			seedMapping(rolesmappingRepository, adminRole.getRole(), 3L);

			// ── 4. Seed default Admin user ────────────────────────────────────────────
			Users adminUser = usersRepository.findByEmail("admin");
			if (adminUser == null) {
				adminUser = new Users();
			}
			adminUser.setFullname("Admin User");
			adminUser.setPhone("0000000000");
			adminUser.setEmail("admin");
			adminUser.setPassword("admin@123");
			adminUser.setRole(adminRole.getRole().intValue());
			adminUser.setStatus(1);
			usersRepository.save(adminUser);

			// ── 5. Seed default Plans ──────────────────────────────────────────────────
			Plan starterPlan = planRepository.findByPlanNameIgnoreCase("Starter").orElseGet(() -> {
				Plan p = new Plan();
				p.setPlanName("Starter");
				p.setDescription("A lean plan for users who only need one active device and fast browsing.");
				p.setCategory("Solo users");
				p.setFeatures("1 screen, Offline access, Smart recommendations");
				p.setMonthlyPrice(9.0);
				p.setDurationMonths(1);
				p.setActive(true);
				return planRepository.save(p);
			});

			Plan plusPlan = planRepository.findByPlanNameIgnoreCase("Plus").orElseGet(() -> {
				Plan p = new Plan();
				p.setPlanName("Plus");
				p.setDescription("A practical plan that fits families or teams who want a little more room.");
				p.setCategory("Shared households");
				p.setFeatures("3 screens, Profile sharing, Billing reminders");
				p.setMonthlyPrice(14.0);
				p.setDurationMonths(1);
				p.setActive(true);
				return planRepository.save(p);
			});

			Plan proPlan = planRepository.findByPlanNameIgnoreCase("Pro").orElseGet(() -> {
				Plan p = new Plan();
				p.setPlanName("Pro");
				p.setDescription("The best fit for users who track status, switch plans often, and need headroom.");
				p.setCategory("Heavy streamers");
				p.setFeatures("5 screens, Priority queue, Advanced plan insights");
				p.setMonthlyPrice(19.0);
				p.setDurationMonths(1);
				p.setActive(true);
				return planRepository.save(p);
			});

			Plan elitePlan = planRepository.findByPlanNameIgnoreCase("Elite").orElseGet(() -> {
				Plan p = new Plan();
				p.setPlanName("Elite");
				p.setDescription("Built for users who need the fullest plan and visibility into usage trends.");
				p.setCategory("Power teams");
				p.setFeatures("8 screens, Dedicated account view, Usage analytics");
				p.setMonthlyPrice(29.0);
				p.setDurationMonths(1);
				p.setActive(true);
				return planRepository.save(p);
			});

			// ── 6. Seed default Users and Subscriptions ───────────────────────────────
			seedUserAndSubscription(usersRepository, subscriptionRepository, planRepository,
					"Aarav Mehta", "+91 98765 43210", "aarav@streamflow.com", "aarav@123", 1, "Pro", 30);

			seedUserAndSubscription(usersRepository, subscriptionRepository, planRepository,
					"Priya Sharma", "+91 91234 56789", "priya@streamflow.com", "priya@123", 1, "Elite", 365);

			seedUserAndSubscription(usersRepository, subscriptionRepository, planRepository,
					"Vikram Singh", "+91 98123 45670", "vikram@streamflow.com", "vikram@123", 1, "Starter", 30);

			seedUserAndSubscription(usersRepository, subscriptionRepository, planRepository,
					"Neha Patel", "+91 95555 12345", "neha@streamflow.com", "neha@123", 99, "Pro", 365);
		};
	}

	/** Insert a Menu row only if it does not already exist. */
	private void seedMenu(MenusRepository repo, Long mid, String name, String icon) {
		repo.findById(mid).orElseGet(() -> {
			Menus m = new Menus();
			m.setMid(mid);
			m.setMenu(name);
			m.setIcon(icon);
			return repo.save(m);
		});
	}

	/** Insert a Rolesmapping row only if it does not already exist. */
	private void seedMapping(RolesmappingRepository repo, Long role, Long mid) {
		RolesmappingId id = new RolesmappingId(role, mid);
		repo.findById(id).orElseGet(() -> {
			Rolesmapping rm = new Rolesmapping();
			rm.setRole(role);
			rm.setMid(mid);
			return repo.save(rm);
		});
	}

	/** Seed default user and subscription in database if not present. */
	private void seedUserAndSubscription(
			UsersRepository uRepo,
			SubscriptionRepository sRepo,
			PlanRepository pRepo,
			String name,
			String phone,
			String email,
			String password,
			int role,
			String planName,
			int durationDays) {

		Users user = uRepo.findByEmail(email);
		if (user == null) {
			user = new Users();
			user.setFullname(name);
			user.setPhone(phone);
			user.setEmail(email);
			user.setPassword(password);
			user.setRole(role);
			user.setStatus(1);
			user = uRepo.save(user);
		}

		final Long userId = user.getId();

		// Check if they already have an active subscription
		java.util.Optional<Subscription> existingSub = sRepo.findTopByUserIdAndStatusIgnoreCaseOrderByUpdatedAtDesc(userId, "ACTIVE");
		if (existingSub.isEmpty()) {
			Plan plan = pRepo.findByPlanNameIgnoreCase(planName).orElse(null);
			if (plan != null) {
				Subscription sub = new Subscription();
				sub.setUserId(userId);
				sub.setPlanId(plan.getId());
				sub.setStatus("ACTIVE");
				sub.setStartDate(LocalDate.now());
				sub.setRenewalDate(LocalDate.now().plusDays(durationDays));
				sub.setNotes("Initial seeded subscription for " + planName);
				sRepo.save(sub);
			}
		}
	}
}
